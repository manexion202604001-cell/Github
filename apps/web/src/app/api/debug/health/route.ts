import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/server/db'
import { env } from '@/lib/env'
import { buildComparison } from '@/features/oem/service'
import { debugGenerateConceptImage, debugTestImageProvider, imageChainFor } from '@/server/org-providers'
import { loadImageBytes } from '@/features/images/service'
import { IMAGE_PRESETS, buildPresetPrompt } from '@/prompts/image-prompts'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type StepResult = { step: string; ok: boolean; ms: number; error?: string; data?: unknown }

async function step(name: string, run: () => Promise<unknown>): Promise<StepResult> {
  const start = Date.now()
  try {
    const data = await run()
    const result: StepResult = { step: name, ok: true, ms: Date.now() - start }
    if (data !== undefined && data !== null) {
      // 応答が肥大化しないよう上限を設ける
      const text = JSON.stringify(data)
      result.data = text.length > 6000 ? `${text.slice(0, 6000)}…(truncated)` : data
    }
    return result
  } catch (error) {
    const message =
      error instanceof Error ? `${error.name}: ${error.message}\n${(error.stack ?? '').slice(0, 600)}` : String(error)
    return { step: name, ok: false, ms: Date.now() - start, error: message }
  }
}

/**
 * 本番診断用(CRON_SECRET認証)。ページと同じDBアクセスを順に実行し、
 * どこで何の例外が出るかを返す。Vercelログを見られない環境からの調査に使う。
 */
export async function GET(request: NextRequest) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || token !== secret) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // ?image=preset&presetId=LIFESTYLE — 本番のアンカー画像を参照に用途別画像を1枚生成して返す(同一性確認用)
  if (request.nextUrl.searchParams.get('image') === 'preset') {
    const presetId = request.nextUrl.searchParams.get('presetId') ?? 'LIFESTYLE'
    const preset = IMAGE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return NextResponse.json({ data: { ok: false, message: `未知のプリセット: ${presetId}` } })

    const anchorImage = await db.productImage.findFirst({
      where: { isAnchor: true },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { project: { select: { organizationId: true } } } } },
    })
    if (!anchorImage) return NextResponse.json({ data: { ok: false, message: 'アンカー画像がありません' } })

    const anchorBytes = await loadImageBytes(anchorImage.url)
    if (!anchorBytes) return NextResponse.json({ data: { ok: false, message: 'アンカー画像を読み込めませんでした' } })

    const chain = (await imageChainFor(anchorImage.product.project.organizationId)).filter((p) => !p.synthetic)
    const provider = chain[0]
    if (!provider) return NextResponse.json({ data: { ok: false, message: '実画像Providerが未設定です' } })

    const productDescription = [anchorImage.product.name, anchorImage.product.category, anchorImage.product.color]
      .filter((value): value is string => Boolean(value))
      .join(' / ')
    const outcome = await provider.generate({
      prompt: buildPresetPrompt(productDescription, preset, true),
      count: 1,
      aspectRatio: preset.aspectRatio,
      referenceImages: [anchorBytes],
    })
    if (!outcome.ok) {
      return NextResponse.json({ data: { ok: false, errorKind: outcome.error.kind, message: outcome.error.message.slice(0, 500) } })
    }
    const image = outcome.data[0]
    if (!image) return NextResponse.json({ data: { ok: false, message: '画像が返却されませんでした' } })
    return new NextResponse(Buffer.from(image.base64, 'base64'), {
      status: 200,
      headers: { 'content-type': image.mimeType, 'cache-control': 'no-store' },
    })
  }

  // ?image=concept&variant=A — 本番のコンセプト生成プロンプトで1枚生成し、画像そのものを返す(画質確認用)
  if (request.nextUrl.searchParams.get('image') === 'concept') {
    const raw = request.nextUrl.searchParams.get('variant')
    const variant = raw === 'B' || raw === 'C' ? raw : 'A'
    const result = await debugGenerateConceptImage(variant)
    if (result.ok !== true || typeof result.base64 !== 'string') {
      return NextResponse.json({ data: result }, { status: 200 })
    }
    return new NextResponse(Buffer.from(result.base64, 'base64'), {
      status: 200,
      headers: {
        'content-type': typeof result.mimeType === 'string' ? result.mimeType : 'image/png',
        'x-image-model': typeof result.model === 'string' ? result.model : '',
        'cache-control': 'no-store',
      },
    })
  }

  const results: StepResult[] = []
  results.push(await step('env', async () => ({ hasAuth: env.authSecret.length > 0 })))
  results.push(await step('db.select1', () => db.$queryRaw`select 1`))
  results.push(await step('db.userCount', () => db.user.count()))

  let projectId: string | null = null
  results.push(
    await step('db.firstProject', async () => {
      const project = await db.project.findFirst({ select: { id: true } })
      projectId = project?.id ?? null
    }),
  )

  if (projectId) {
    const id = projectId
    results.push(await step('oem.suppliers', () => db.oEMSupplier.findMany({ take: 5, select: { id: true } })))
    results.push(
      await step('oem.quotes+comparison', async () => {
        const quotes = await db.oEMQuote.findMany({ where: { projectId: id }, include: { supplier: true } })
        buildComparison(quotes, null)
      }),
    )
  }

  // 直近ジョブの実行状況(市場調査・画像生成などの失敗原因調査用)
  results.push(
    await step('jobs.recent', () =>
      db.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          kind: true,
          handler: true,
          status: true,
          progress: true,
          attempts: true,
          error: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ),
  )

  // 直近の市場調査の状態とエラー・使用ソース
  results.push(
    await step('market.recent', async () => {
      const rows = await db.marketResearch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          keyword: true,
          source: true,
          status: true,
          error: true,
          rawData: true,
          createdAt: true,
          completedAt: true,
        },
      })
      return rows.map((row) => ({
        ...row,
        rawData:
          row.rawData && typeof row.rawData === 'object'
            ? { sourceErrors: (row.rawData as Record<string, unknown>).sourceErrors, sources: (row.rawData as Record<string, unknown>).sources }
            : null,
      }))
    }),
  )

  // 有効な連携(キー本体は返さない)
  results.push(
    await step('integrations', () =>
      db.integration.findMany({
        where: { enabled: true },
        take: 10,
        select: { kind: true, provider: true, enabled: true, config: true },
      }),
    ),
  )

  // ?image=1 のときだけ、登録済み画像Providerを実際に1回呼んで結果を返す
  // (画像1枚分のコストがかかるため明示オプトイン)
  if (request.nextUrl.searchParams.get('image') === '1') {
    results.push(await step('image.provider', () => debugTestImageProvider()))
  }

  const failed = results.filter((result) => !result.ok)
  return NextResponse.json({ data: { healthy: failed.length === 0, results } }, { status: 200 })
}
