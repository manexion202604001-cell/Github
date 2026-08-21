import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { encryptSecret } from '@/server/crypto'
import { recordAudit } from '@/server/audit'
import { requireOrganizationRole, requireOrganization } from '@/server/authz'
import { INTEGRATION_OPTIONS, type UpsertIntegrationInput } from './schema'

function validProvider(kind: string, provider: string): boolean {
  const option = INTEGRATION_OPTIONS.find((item) => item.kind === kind)
  return Boolean(option?.providers.some((entry) => entry.id === provider))
}

/** 秘密値は返さない。設定済みかどうかだけを返す(要件110)。 */
export async function listIntegrations(organizationId?: string) {
  const context = await requireOrganization(organizationId)
  const rows = await db.integration.findMany({
    where: { organizationId: context.organizationId, kind: { in: ['AI_PROVIDER', 'IMAGE_PROVIDER', 'MARKET_DATA'] } },
    orderBy: [{ kind: 'asc' }, { updatedAt: 'desc' }],
  })
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    provider: row.provider,
    enabled: row.enabled,
    hasSecret: row.encryptedSecret !== null,
    model:
      row.config && typeof row.config === 'object' && typeof (row.config as Record<string, unknown>).model === 'string'
        ? ((row.config as Record<string, unknown>).model as string)
        : null,
    updatedAt: row.updatedAt,
  }))
}

export async function upsertIntegration(input: UpsertIntegrationInput, organizationId?: string) {
  const context = await requireOrganizationRole(
    organizationId ?? (await requireOrganization()).organizationId,
    'ADMIN',
  )
  if (!validProvider(input.kind, input.provider)) {
    throw AppError.validation('未対応のProviderです')
  }

  const config = input.model ? { model: input.model } : {}
  const secret = input.secret?.trim()

  // キー省略時は保存済みのキーを維持する(モデル・Providerの切替だけを許可)
  if (!secret) {
    const existing = await db.integration.findUnique({
      where: {
        organizationId_kind_provider: {
          organizationId: context.organizationId,
          kind: input.kind,
          provider: input.provider,
        },
      },
      select: { encryptedSecret: true },
    })
    if (!existing?.encryptedSecret) {
      throw AppError.validation('このProviderは未設定です。APIキーを入力してください。')
    }
  }

  const [, saved] = await db.$transaction([
    // 同じ種別の他Providerは無効化し、常に1種別1つが有効になるようにする
    db.integration.updateMany({
      where: { organizationId: context.organizationId, kind: input.kind, provider: { not: input.provider } },
      data: { enabled: false },
    }),
    db.integration.upsert({
      where: {
        organizationId_kind_provider: {
          organizationId: context.organizationId,
          kind: input.kind,
          provider: input.provider,
        },
      },
      create: {
        organizationId: context.organizationId,
        kind: input.kind,
        provider: input.provider,
        enabled: true,
        config,
        // create経路に来るのは上の検証を通ったときのみ = secretは必ず存在する
        encryptedSecret: encryptSecret(secret ?? ''),
      },
      update: {
        enabled: true,
        config,
        ...(secret ? { encryptedSecret: encryptSecret(secret) } : {}),
      },
    }),
  ])

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'integration.upsert',
    entityType: 'Integration',
    entityId: saved.id,
    summary: `${input.kind} を ${input.provider} に設定`,
  })

  return { id: saved.id }
}

export async function deleteIntegration(id: string, organizationId?: string) {
  const context = await requireOrganizationRole(
    organizationId ?? (await requireOrganization()).organizationId,
    'ADMIN',
  )
  const row = await db.integration.findUnique({ where: { id } })
  if (!row || row.organizationId !== context.organizationId) throw AppError.notFound('設定が見つかりません')

  await db.integration.delete({ where: { id } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'integration.delete',
    entityType: 'Integration',
    entityId: id,
    summary: `${row.kind} / ${row.provider} を削除`,
  })
}
