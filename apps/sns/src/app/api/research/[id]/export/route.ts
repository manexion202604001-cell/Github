import type { NextRequest } from 'next/server'
import { apiHandler } from '@/server/api'
import { getResearchRun } from '@/features/research/service'
import { toMarkdown, type InsightRecord } from '@/features/research/domain'
import { RESEARCH_SECTIONS, RESEARCH_OBJECTIVES, labelOf } from '@/lib/config/taxonomy'
import { channelLabel } from '@/lib/config/channels'

/** 調査レポートの Markdown ダウンロード(要件102)。 */
export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (_request: NextRequest, context) => {
  const { id } = await context.params
  const run = await getResearchRun(id)

  const insights: InsightRecord[] = run.insights.map((insight) => ({
    id: insight.id,
    category: insight.category,
    title: insight.title,
    content: insight.content,
    insightType: insight.insightType,
    confidence: insight.confidence,
    sourceIds: insight.sourceIds,
    metaJson: insight.metaJson,
    position: insight.position,
  }))

  const markdown = toMarkdown({
    title: run.title,
    brandName: run.brand.name,
    channelLabel: channelLabel(run.channel),
    region: run.region,
    objectiveLabel: labelOf(RESEARCH_OBJECTIVES, run.objective),
    createdAt: run.createdAt,
    summary: run.summary,
    insights,
    sources: run.sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      domain: source.domain,
      snippet: source.snippet,
      searchQuery: source.searchQuery,
      position: source.position,
    })),
    sectionLabels: RESEARCH_SECTIONS.map((section) => ({ key: section.key, label: section.jaLabel })),
  })

  const filename = `research-${run.id}.md`
  return new Response(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
})
