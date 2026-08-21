import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { runAIChat } from '@/server/ai-task'
import { buildAssistantSystem } from '@/prompts/assistant'
import { buildProjectContext } from './context'

const MAX_HISTORY = 12

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
 * AI Assistant への質問(要件78〜80)。
 * Project Context を毎回注入するため、ユーザーは商品情報を再入力しない。
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

  const result = await runAIChat(
    {
      system: buildAssistantSystem(snapshot, input.screen),
      messages: [
        ...history
          .reverse()
          .map((message) => ({
            role: message.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
            content: message.content,
          })),
        { role: 'user', content: input.message },
      ],
      maxTokens: 2048,
    },
    {
      organizationId: context.organizationId,
      projectId: input.projectId,
      purpose: 'assistant.chat',
    },
  )

  const answer = await db.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: result.text,
      // 本文ではなく「何を参照したか」だけを監査用に残す(要件111)。
      contextRefs: Object.keys(snapshot).filter((key) => snapshot[key as keyof typeof snapshot] !== null),
    },
  })

  await db.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })

  return { conversationId: conversation.id, message: answer, synthetic: result.synthetic }
}
