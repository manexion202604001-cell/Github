import 'server-only'
import { cache } from 'react'
import { db } from '@/server/db'

/**
 * 組織ごとの既定AI Provider(設定 › AI で変更可能)。
 * 未設定なら環境変数の AI_PROVIDER に従う。
 */
export const organizationProviderId = cache(async (organizationId: string): Promise<string | undefined> => {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { aiProvider: true },
  })
  return organization?.aiProvider ?? undefined
})
