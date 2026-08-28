import 'server-only'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'

export type AuditInput = {
  organizationId: string
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary?: string | null
  meta?: unknown
}

/**
 * 誰が・いつ・何を変更したかを記録する(要件105)。
 * 監査ログの書き込み失敗で業務処理を止めない(ログには必ず残す)。
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        metaJson: input.meta === undefined ? undefined : JSON.parse(JSON.stringify(input.meta)),
      },
    })
  } catch (error) {
    logger.error('audit.write_failed', {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
