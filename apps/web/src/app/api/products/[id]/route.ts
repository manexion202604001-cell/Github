import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { updateProductSchema } from '@/features/products/schema'
import { getProduct, updateProduct } from '@/features/products/service'

// :id は projectId(Product は Project と 1:1)。
type Context = { params: Promise<{ id: string }> }

export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const { id } = await context.params
  return jsonOk(await getProduct(id))
})

export const PATCH = apiHandler<Context>(async (request, context) => {
  const { id } = await context.params
  const input = await parseBody(request, updateProductSchema)
  return jsonOk(await updateProduct(id, input))
})
