import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import {
  addSection,
  deleteSection,
  exportHtml,
  getCurrentLandingPage,
  publishLandingPage,
  reorderSections,
  updateSection,
} from '@/features/lp/service'

/** GET ?projectId=&format=json|html — LP出力(要件57)。 */
export const GET = apiHandler(async (request: NextRequest) => {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')

  if (url.searchParams.get('format') === 'html') {
    const html = await exportHtml(projectId)
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
  return jsonOk(await getCurrentLandingPage(projectId))
})

const itemSchema = z.object({ label: z.string().max(300), value: z.string().max(2000).nullable() })

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update-section'),
    projectId: z.string().min(1),
    sectionId: z.string().min(1),
    title: z.string().max(300).nullable().optional(),
    subtitle: z.string().max(500).nullable().optional(),
    body: z.string().max(8000).nullable().optional(),
    items: z.array(itemSchema).max(30).optional(),
    imageUrl: z.string().max(1000).nullable().optional(),
    ctaLabel: z.string().max(120).nullable().optional(),
    ctaHref: z.string().max(1000).nullable().optional(),
    visible: z.boolean().optional(),
  }),
  z.object({ action: z.literal('reorder'), projectId: z.string().min(1), orderedIds: z.array(z.string()).max(50) }),
  z.object({
    action: z.literal('add-section'),
    projectId: z.string().min(1),
    kind: z.enum(['HERO', 'PROBLEM', 'PRODUCT', 'FEATURES', 'BENEFITS', 'HOW_TO_USE', 'COMPARISON', 'REVIEWS', 'FAQ', 'CTA', 'CUSTOM']),
  }),
  z.object({ action: z.literal('delete-section'), projectId: z.string().min(1), sectionId: z.string().min(1) }),
  z.object({ action: z.literal('publish'), projectId: z.string().min(1) }),
])

/** LPエディター操作(要件55)。 */
export const PATCH = apiHandler(async (request) => {
  const input = await parseBody(request, patchSchema)

  switch (input.action) {
    case 'update-section': {
      const { action: _action, projectId, sectionId, ...fields } = input
      return jsonOk(await updateSection(projectId, sectionId, fields))
    }
    case 'reorder':
      await reorderSections(input.projectId, input.orderedIds)
      return jsonOk({ ok: true })
    case 'add-section':
      return jsonOk(await addSection(input.projectId, input.kind), { status: 201 })
    case 'delete-section':
      await deleteSection(input.projectId, input.sectionId)
      return jsonOk({ ok: true })
    case 'publish':
      return jsonOk(await publishLandingPage(input.projectId))
  }
})
