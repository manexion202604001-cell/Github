import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { optionalString } from '@/validators/common'
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '@/features/oem/service'

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  country: optionalString(80),
  region: optionalString(120),
  contactName: optionalString(80),
  email: z.string().email().max(254).nullable().optional(),
  phone: optionalString(40),
  website: z.string().url().max(500).nullable().optional(),
  categories: z.array(z.string().max(60)).max(20).optional(),
  priceLevel: optionalString(40),
  moq: z.number().int().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  note: optionalString(2000),
})

export const GET = apiHandler(async () => jsonOk(await listSuppliers()))

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, supplierSchema)
  return jsonOk(await createSupplier(input), { status: 201 })
})

const updateSchema = supplierSchema.partial().extend({ id: z.string().min(1) })

export const PATCH = apiHandler(async (request) => {
  const { id, ...input } = await parseBody(request, updateSchema)
  return jsonOk(await updateSupplier(id, input))
})

export const DELETE = apiHandler(async (request) => {
  const { id } = await parseBody(request, z.object({ id: z.string().min(1) }))
  await deleteSupplier(id)
  return jsonOk({ ok: true })
})
