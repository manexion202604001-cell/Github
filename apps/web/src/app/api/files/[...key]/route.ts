import { NextResponse, type NextRequest } from 'next/server'
import { apiHandler } from '@/server/api'
import { AppError } from '@/lib/errors'
import { requireUser } from '@/server/authz'
import { storage } from '@/providers/storage'

type Context = { params: Promise<{ key: string[] }> }

/**
 * ローカルStorageのファイル配信。ログイン必須(要件110: ファイルアクセス制御)。
 * S3等の外部Storage利用時はこのルートを通らず署名URLで配信される。
 */
export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  await requireUser()
  const { key } = await context.params
  const objectKey = key.map(decodeURIComponent).join('/')
  if (objectKey.includes('..')) throw AppError.validation('不正なパスです')

  const object = await storage().get(objectKey)
  if (!object) throw AppError.notFound('ファイルが見つかりません')

  return new NextResponse(new Uint8Array(object.body), {
    headers: {
      'content-type': object.contentType,
      'cache-control': 'private, max-age=3600',
    },
  })
})
