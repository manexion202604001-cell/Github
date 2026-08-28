import 'server-only'
import type { z } from 'zod'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { aiProvider } from './provider'
import { recordUsage } from '@/server/usage'
import type { CompleteOptions } from './types'

/**
 * 1つのAIユースケースを型で閉じた単位(要件50, 94)。
 * prompt / zodスキーマ / モックを1箇所へまとめることで
 *  - 長文プロンプトをComponentへ散乱させない
 *  - AIの出力を検証せずDBへ保存しない
 *  - APIキーが無くても全機能が動く
 * を構造的に守る。
 */
export type AITask<TInput, TOutput> = {
  id: string
  system: string
  schema: z.ZodType<TOutput, z.ZodTypeDef, unknown>
  buildUser: (input: TInput) => string
  /** 外部由来テキスト。Adapter側で <untrusted_data> に隔離される。 */
  untrusted?: (input: TInput) => { label: string; content: string }[]
  /** Provider未設定時に返す固定サンプル。実データと混ざらないよう必ず明示的に用意する。 */
  mock: (input: TInput) => TOutput
  maxTokens?: number
  temperature?: number
}

export type AITaskContext = {
  organizationId: string
  userId?: string | null
  providerId?: string
}

export type AITaskResult<TOutput> = {
  data: TOutput
  /** true の場合、AIによる実推論ではなくサンプルデータ。 */
  synthetic: boolean
  provider: string
  model: string
}

export async function runAITask<TInput, TOutput>(
  task: AITask<TInput, TOutput>,
  input: TInput,
  context: AITaskContext,
): Promise<AITaskResult<TOutput>> {
  const provider = aiProvider(context.providerId)

  if (provider.synthetic) {
    logger.info('ai_task.mock', { task: task.id })
    return { data: task.mock(input), synthetic: true, provider: provider.id, model: 'mock' }
  }

  const options: CompleteOptions = {
    system: task.system,
    messages: [{ role: 'user', content: task.buildUser(input) }],
    maxTokens: task.maxTokens ?? 4096,
    temperature: task.temperature ?? 0.6,
  }
  const untrusted = task.untrusted?.(input)
  if (untrusted && untrusted.length > 0) options.untrusted = untrusted

  const outcome = await provider.generateStructured(task.schema, options)

  await recordUsage({
    organizationId: context.organizationId,
    userId: context.userId ?? null,
    feature: task.id,
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) {
    logger.error('ai_task.failed', { task: task.id, kind: outcome.error.kind })
    throw new AppError('PROVIDER_ERROR', aiErrorMessage(outcome.error.kind), {
      hint: aiErrorHint(outcome.error.kind),
    })
  }

  return { data: outcome.data, synthetic: false, provider: outcome.usage.provider, model: outcome.usage.model }
}

/** 「何が起きたか」を日本語で伝える(要件90)。 */
function aiErrorMessage(kind: string): string {
  switch (kind) {
    case 'AUTH':
      return 'AIサービスの認証に失敗しました。'
    case 'RATE_LIMIT':
      return 'AIサービスの利用上限に達しました。'
    case 'TIMEOUT':
      return 'AIの生成が時間内に完了しませんでした。'
    case 'INVALID_RESPONSE':
      return '生成形式の解析に失敗しました。'
    case 'NETWORK':
      return 'AIサービスへ接続できませんでした。'
    default:
      return 'AI処理に失敗しました。'
  }
}

/** 「次に何をすべきか」を伝える(要件90)。 */
function aiErrorHint(kind: string): string {
  switch (kind) {
    case 'AUTH':
      return '設定 › AI から APIキーの設定を確認してください。'
    case 'RATE_LIMIT':
      return '数分後に再実行してください。'
    case 'TIMEOUT':
      return '生成件数を減らすか、時間をおいて再実行してください。'
    case 'INVALID_RESPONSE':
      return 'もう一度実行してください。繰り返す場合は生成件数を減らしてください。'
    default:
      return '数分後に再実行してください。'
  }
}
