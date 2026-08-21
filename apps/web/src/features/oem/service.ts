import 'server-only'
import type { QuoteStatus } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
import { requireOrganization, requireProjectAccess } from '@/server/authz'

export type SupplierInput = {
  name: string
  country?: string | null
  region?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  categories?: string[]
  priceLevel?: string | null
  moq?: number | null
  leadTimeDays?: number | null
  rating?: number | null
  note?: string | null
}

export async function listSuppliers(organizationId?: string) {
  const context = await requireOrganization(organizationId)
  return db.oEMSupplier.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSupplier(input: SupplierInput, organizationId?: string) {
  const context = await requireOrganization(organizationId)
  if (context.role === 'VIEWER') throw AppError.forbidden()

  const supplier = await db.oEMSupplier.create({
    data: {
      organizationId: context.organizationId,
      name: input.name,
      country: input.country ?? null,
      region: input.region ?? null,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      categories: input.categories ?? [],
      priceLevel: input.priceLevel ?? null,
      moq: input.moq ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      rating: input.rating ?? null,
      note: input.note ?? null,
    },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'oem.supplier.create',
    entityType: 'OEMSupplier',
    entityId: supplier.id,
    summary: `OEM会社「${input.name}」を登録`,
  })

  return supplier
}

export async function updateSupplier(supplierId: string, input: Partial<SupplierInput>) {
  const supplier = await db.oEMSupplier.findUnique({ where: { id: supplierId } })
  if (!supplier) throw AppError.notFound('OEM会社が見つかりません')
  const context = await requireOrganization(supplier.organizationId)
  if (context.role === 'VIEWER') throw AppError.forbidden()

  return db.oEMSupplier.update({ where: { id: supplierId }, data: input })
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  const supplier = await db.oEMSupplier.findUnique({ where: { id: supplierId } })
  if (!supplier) throw AppError.notFound('OEM会社が見つかりません')
  const context = await requireOrganization(supplier.organizationId)
  if (context.role === 'VIEWER') throw AppError.forbidden()
  await db.oEMSupplier.delete({ where: { id: supplierId } })
}

export type QuoteInput = {
  supplierId: string
  status?: QuoteStatus
  unitPrice?: number | null
  moq?: number | null
  sampleCost?: number | null
  shippingCost?: number | null
  toolingCost?: number | null
  leadTimeDays?: number | null
  note?: string | null
}

export async function listQuotes(projectId: string) {
  await requireProjectAccess(projectId)
  return db.oEMQuote.findMany({
    where: { projectId },
    include: { supplier: true },
    orderBy: [{ unitPrice: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function upsertQuote(projectId: string, input: QuoteInput) {
  const context = await requireProjectAccess(projectId, 'EDITOR')

  const supplier = await db.oEMSupplier.findUnique({ where: { id: input.supplierId } })
  if (!supplier || supplier.organizationId !== context.organizationId) {
    throw AppError.notFound('OEM会社が見つかりません')
  }

  const data = {
    status: input.status ?? 'DRAFT',
    unitPrice: input.unitPrice ?? null,
    moq: input.moq ?? null,
    sampleCost: input.sampleCost ?? null,
    shippingCost: input.shippingCost ?? null,
    toolingCost: input.toolingCost ?? null,
    leadTimeDays: input.leadTimeDays ?? null,
    note: input.note ?? null,
  }

  return db.oEMQuote.upsert({
    where: { projectId_supplierId: { projectId, supplierId: input.supplierId } },
    create: { projectId, supplierId: input.supplierId, ...data },
    update: data,
  })
}

export async function deleteQuote(projectId: string, quoteId: string): Promise<void> {
  await requireProjectAccess(projectId, 'EDITOR')
  await db.oEMQuote.deleteMany({ where: { id: quoteId, projectId } })
}

/**
 * 見積比較表(要件47)。
 * 初回ロット総額 = 単価 × MOQ + 金型費 + サンプル費 + 送料。
 */
export function buildComparison(
  quotes: {
    id: string
    unitPrice: number | null
    moq: number | null
    sampleCost: number | null
    shippingCost: number | null
    toolingCost: number | null
    leadTimeDays: number | null
    supplier: { name: string; country: string | null; rating: number | null }
  }[],
  targetUnitCost: number | null,
) {
  const rows = quotes.map((quote) => {
    const units = quote.moq ?? 0
    const initialTotal =
      (quote.unitPrice ?? 0) * units + (quote.toolingCost ?? 0) + (quote.sampleCost ?? 0) + (quote.shippingCost ?? 0)
    const effectiveUnitCost = units > 0 ? Math.round(initialTotal / units) : quote.unitPrice ?? 0

    return {
      id: quote.id,
      supplierName: quote.supplier.name,
      country: quote.supplier.country,
      rating: quote.supplier.rating,
      unitPrice: quote.unitPrice,
      moq: quote.moq,
      leadTimeDays: quote.leadTimeDays,
      initialTotal,
      effectiveUnitCost,
      withinTarget: targetUnitCost === null ? null : effectiveUnitCost <= targetUnitCost,
    }
  })

  const priced = rows.filter((row) => row.unitPrice !== null && row.unitPrice > 0)
  return {
    rows,
    best: priced.length > 0 ? priced.reduce((min, row) => (row.effectiveUnitCost < min.effectiveUnitCost ? row : min)) : null,
    targetUnitCost,
  }
}
