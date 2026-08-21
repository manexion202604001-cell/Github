import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/server/db'
import { env } from '@/lib/env'
import { buildComparison } from '@/features/oem/service'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type StepResult = { step: string; ok: boolean; ms: number; error?: string }

async function step(name: string, run: () => Promise<unknown>): Promise<StepResult> {
  const start = Date.now()
  try {
    await run()
    return { step: name, ok: true, ms: Date.now() - start }
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
    results.push(await step('oem.suppliers', () => db.oEMSupplier.findMany({ take: 5 })))
    results.push(
      await step('oem.quotes+comparison', async () => {
        const quotes = await db.oEMQuote.findMany({ where: { projectId: id }, include: { supplier: true } })
        buildComparison(quotes, null)
      }),
    )
    results.push(
      await step('market.latest', () =>
        db.marketResearch.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
      ),
    )
    results.push(
      await step('integrations', () => db.integration.findMany({ where: { enabled: true }, take: 5 })),
    )
  }

  const failed = results.filter((result) => !result.ok)
  return NextResponse.json({ data: { healthy: failed.length === 0, results } }, { status: 200 })
}
