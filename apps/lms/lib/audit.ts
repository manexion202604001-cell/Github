import 'server-only'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'

export type AuditAction =
  | 'role.update'
  | 'deletion.approve'
  | 'deletion.reject'
  | 'content.hide'
  | 'content.unhide'
  | 'invitation.create'
  | 'invitation.revoke'
  | 'course.publish'
  | 'course.delete'
  | (string & {})

/**
 * 監査ログ（§11）: ロール変更・退会承認・コンテンツ非表示などを記録する。
 * 他担当（Q&A / コミュニティの非表示処理）からも呼べるよう export。失敗しても本処理は止めない。
 */
export async function logAudit(input: {
  actorId: string | null
  action: AuditAction
  targetType?: string | null
  targetId?: string | null
  detail?: Record<string, unknown> | null
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      detail: input.detail ?? null,
    })
  } catch (e) {
    console.error('[audit] failed to write', e)
  }
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'role.update': 'ロール変更',
  'deletion.approve': '退会承認',
  'deletion.reject': '退会却下',
  'content.hide': 'コンテンツ非表示',
  'content.unhide': 'コンテンツ再表示',
  'invitation.create': '招待発行',
  'invitation.revoke': '招待取消',
  'course.publish': 'コース公開',
  'course.delete': 'コース削除',
}
