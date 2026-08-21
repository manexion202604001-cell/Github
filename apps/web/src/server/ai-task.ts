import 'server-only'
import type { z } from 'zod'
import { aiProviders } from '@/providers/ai'
import { runWithFallback } from '@/providers/registry'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { recordUsage } from '@/server/usage'

/**
 * 1つのAIユースケースを型で閉じた単位。
 * prompt / スキーマ / モックを1箇所にまとめることで、
 *  - Prompt を Component に書かない(要件125)
 *  - Mock Data と Production Data を分離する(要件121)
 * の両方を構造的に守る。
 */
export type AITask<TInput, TOutput> = {
  id: string
  system: string
  schema: z.ZodType<TOutput, z.ZodTypeDef, unknown>
  buildUser: (input: TInput) => string
  /** 外部由来テキスト。Adapter側で `<untrusted_data>` に隔離される。 */
  untrusted?: (input: TInput) => { label: string; content: string }[]
  /** AI Provider 未設定時に返すサンプル。実データと混ざらないよう必ず明示的に用意する。 */
  mock: (input: TInput) => TOutput
  maxTokens?: number
  temperature?: number
}

export type AITaskContext = {
  organizationId: string
  projectId?: string | null
  jobId?: string | null
  /** 生成に使うProviderを明示指定する場合。 */
  providerId?: string
}

export type AITaskResult<TOutput> = {
  data: TOutput
  synthetic: boolean
  provider: string
  model: string
}

export async function runAITask<TInput, TOutput>(
  task: AITask<TInput, TOutput>,
  input: TInput,
  context: AITaskContext,
): Promise<AITaskResult<TOutput>> {
  const registry = aiProviders()
  const chain = registry.chain(context.providerId ? [context.providerId] : undefined)
  const primary = chain[0] ?? registry.get()

  if (primary.synthetic) {
    logger.info('ai_task.mock', { task: task.id })
    return { data: task.mock(input), synthetic: true, provider: primary.id, model: 'mock' }
  }

  const outcome = await runWithFallback(chain, (provider) =>
    provider.completeJson(task.schema, {
      system: task.system,
      messages: [{ role: 'user', content: task.buildUser(input) }],
      untrusted: task.untrusted?.(input),
      maxTokens: task.maxTokens ?? 4096,
      temperature: task.temperature ?? 0.6,
    }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId: context.projectId ?? null,
    jobId: context.jobId ?? null,
    purpose: task.id,
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) {
    logger.error('ai_task.failed', { task: task.id, provider: outcome.error.provider, kind: outcome.error.kind })
    throw new AppError('PROVIDER_ERROR', `AI処理に失敗しました: ${outcome.error.message}`, {
      provider: outcome.error.provider,
      kind: outcome.error.kind,
    })
  }

  return { data: outcome.data, synthetic: false, provider: outcome.usage.provider, model: outcome.usage.model }
}

/** 自由記述の応答(AI Assistant等)。 */
export async function runAIChat(
  input: {
    system: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    untrusted?: { label: string; content: string }[]
    maxTokens?: number
  },
  context: AITaskContext & { purpose: string },
): Promise<{ text: string; synthetic: boolean }> {
  const registry = aiProviders()
  const chain = registry.chain(context.providerId ? [context.providerId] : undefined)

  const outcome = await runWithFallback(chain, (provider) =>
    provider.complete({
      system: input.system,
      messages: input.messages,
      untrusted: input.untrusted,
      maxTokens: input.maxTokens ?? 2048,
    }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId: context.projectId ?? null,
    jobId: context.jobId ?? null,
    purpose: context.purpose,
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) {
    throw new AppError('PROVIDER_ERROR', `AI処理に失敗しました: ${outcome.error.message}`)
  }

  return { text: outcome.data.text, synthetic: chain[0]?.synthetic ?? false }
}
