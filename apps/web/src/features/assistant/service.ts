import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { requireProjectAccess } from '@/server/authz'
import { runAITask } from '@/server/ai-task'
import { assistantTask, type AssistantAction } from '@/prompts/assistant'
import { updateProduct } from '@/features/products/service'
import { startMarketResearch, startReviewAnalysis } from '@/features/market-research/service'
import { startScoring } from '@/features/scoring/service'
import { buildProjectContext } from './context'

const MAX_HISTORY = 12

/** 変更フィールドの表示名(実行結果チップ用)。 */
const FIELD_LABELS: Record<string, string> = {
  name: '商品名',
  category: 'カテゴリ',
  price: '想定価格',
  target: '想定ユーザー',
  problem: '解決する課題',
  channel: '販売チャネル',
  size: 'サイズ',
  material: '素材',
  color: 'カラー',
}

export type AppliedAction = { ok: boolean; label: string; jobId?: string }

export async function listConversations(projectId: string) {
  await requireProjectAccess(projectId)
  return db.aIConversation.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: { _count: { select: { messages: true } } },
  })
}

export async function getConversation(conversationId: string) {
  const conversation = await db.aIConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!conversation) throw AppError.notFound('会話が見つかりません')
  await requireProjectAccess(conversation.projectId)
  return conversation
}

/**
 * AIが返したアクションを既存serviceを通して実行する(要件78〜80拡張)。
 * service層を経由するため、認可(EDITOR)・監査ログ・入力検証は通常の操作と同一。
 * 1件の失敗で全体を止めず、結果を1件ずつユーザーに報告する。
 */
async function executeActions(projectId: string, actions: AssistantAction[]): Promise<AppliedAction[]> {
  const applied: AppliedAction[] = []

  for (const action of actions.slice(0, 3)) {
    try {
      if (action.type === 'update_product') {
        const keys = Object.keys(action.fields).filter(
          (key) => (action.fields as Record<string, unknown>)[key] !== undefined,
        )
        if (keys.length === 0) continue
        await updateProduct(projectId, action.fields)
        const labels = keys.map((key) => FIELD_LABELS[key] ?? key).join('・')
        applied.push({ ok: true, label: `商品情報を更新(${labels})` })
      } else if (action.type === 'start_market_research') {
        const { job } = await startMarketResearch(projectId, { keyword: action.keyword, depth: action.depth })
        applied.push({ ok: true, label: `市場調査を開始(${action.depth ?? 'STANDARD'})`, jobId: job.id })
      } else if (action.type === 'start_scoring') {
        const job = await startScoring(projectId)
        applied.push({ ok: true, label: 'スコアリングを開始', jobId: job.id })
      } else if (action.type === 'start_review_analysis') {
        const job = await startReviewAnalysis(projectId)
        applied.push({ ok: true, label: 'レビュー解析を開始', jobId: job.id })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '実行に失敗しました'
      logger.warn('assistant.action_failed', { projectId, action: action.type, message })
      applied.push({ ok: false, label: `${action.type}: ${message.slice(0, 120)}` })
    }
  }

  return applied
}

/**
 * AI Copilot への発話(要件78〜80)。
 * Project Context を毎回注入するため、ユーザーは商品情報を再入力しない。
 * 応答は {reply, actions} のJSONで受け取り、アクションはサーバー側で実行して結果を返す。
 */
export async function ask(input: { projectId: string; conversationId?: string; screen: string; message: string }) {
  const context = await requireProjectAccess(input.projectId, 'EDITOR')

  const conversation = input.conversationId
    ? await db.aIConversation.findUnique({ where: { id: input.conversationId } })
    : await db.aIConversation.create({
        data: {
          projectId: input.projectId,
          userId: context.user.id,
          scope: input.screen,
          title: input.message.slice(0, 40),
        },
      })

  if (!conversation || conversation.projectId !== input.projectId) {
    throw AppError.notFound('会話が見つかりません')
  }

  const history = await db.aIMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: MAX_HISTORY,
  })

  const snapshot = await buildProjectContext(input.projectId)

  await db.aIMessage.create({
    data: { conversationId: conversation.id, role: 'USER', content: input.message },
  })

  const result = await runAITask(
    assistantTask,
    {
      context: snapshot,
      screen: input.screen,
      history: history
        .reverse()
        .map((message) => ({
          role: message.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
          content: message.content,
        })),
      message: input.message,
    },
    { organizationId: context.organizationId, projectId: input.projectId },
  )

  // モック応答(Provider未設定)ではアクションを実行しない
  const applied = result.synthetic ? [] : await executeActions(input.projectId, result.data.actions)

  const answer = await db.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: result.data.reply,
      // 本文ではなく「何を参照し何を実行したか」だけを監査用に残す(要件111)。
      contextRefs: [
        ...Object.keys(snapshot).filter((key) => snapshot[key as keyof typeof snapshot] !== null),
        ...applied.map((item) => `action:${item.label}`),
      ],
    },
  })

  await db.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })

  return { conversationId: conversation.id, message: answer, synthetic: result.synthetic, applied }
}
