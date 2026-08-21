import { NextResponse } from 'next/server'
import { getPublicLandingPage, toRenderPage } from '@/features/lp/service'
import { renderLandingPageHtml } from '@/features/lp/domain'

export const dynamic = 'force-dynamic'

/** 公開LP(要件57 Preview URL)。公開済みのLPのみ、認証なしで表示できる。 */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const page = await getPublicLandingPage(slug)
  if (!page) {
    return new NextResponse('Not Found', { status: 404 })
  }
  return new NextResponse(renderLandingPageHtml(toRenderPage(page)), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
    },
  })
}
