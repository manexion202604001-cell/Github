import { listSuppliers, listQuotes, buildComparison } from '@/features/oem/service'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { OEMWorkspace } from './oem-workspace'

/** OEM管理・見積比較(要件46, 47)。 */
export default async function OEMPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  await requireProjectAccess(projectId)

  const [suppliers, quotes, cost] = await Promise.all([
    listSuppliers(),
    listQuotes(projectId),
    db.costSimulation.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      select: { maxManufacturingCost: true },
    }),
  ])

  const comparison = buildComparison(quotes, cost?.maxManufacturingCost ?? null)

  return (
    <OEMWorkspace
      projectId={projectId}
      suppliers={suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        country: supplier.country,
        contactName: supplier.contactName,
        email: supplier.email,
        moq: supplier.moq,
        leadTimeDays: supplier.leadTimeDays,
        rating: supplier.rating,
        note: supplier.note,
      }))}
      quotes={quotes.map((quote) => ({
        id: quote.id,
        supplierId: quote.supplierId,
        supplierName: quote.supplier.name,
        status: quote.status,
        unitPrice: quote.unitPrice,
        moq: quote.moq,
        sampleCost: quote.sampleCost,
        shippingCost: quote.shippingCost,
        toolingCost: quote.toolingCost,
        leadTimeDays: quote.leadTimeDays,
        note: quote.note,
      }))}
      comparison={comparison}
    />
  )
}
