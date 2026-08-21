import { getCurrentLandingPage } from '@/features/lp/service'
import { parseItems } from '@/features/lp/service'
import { LPWorkspace } from './lp-workspace'

/** STEP 10: LP生成・編集・プレビュー(要件51〜57)。 */
export default async function LPPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const page = await getCurrentLandingPage(projectId)

  return (
    <LPWorkspace
      projectId={projectId}
      page={
        page
          ? {
              id: page.id,
              version: page.version,
              title: page.title,
              headline: page.headline,
              subheadline: page.subheadline,
              status: page.status,
              publicSlug: page.publicSlug,
              sections: page.sections.map((section) => ({
                id: section.id,
                kind: section.kind,
                order: section.order,
                title: section.title,
                subtitle: section.subtitle,
                body: section.body,
                items: parseItems(section.items),
                imageUrl: section.imageUrl,
                ctaLabel: section.ctaLabel,
                ctaHref: section.ctaHref,
                visible: section.visible,
              })),
            }
          : null
      }
    />
  )
}
