import { getProduct } from '@/features/products/service'
import { ProductOverviewForm } from './product-form'

/** STEP 1: 商品概要 + AIヒアリング(要件11〜13)。 */
export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const product = await getProduct(projectId)

  return (
    <ProductOverviewForm
      projectId={projectId}
      initial={{
        name: product.name,
        category: product.category,
        description: product.description,
        purpose: product.purpose,
        problem: product.problem,
        target: product.target,
        price: product.price,
        country: product.country,
        channel: product.channel,
        size: product.size,
        weight: product.weight,
        material: product.material,
        color: product.color,
        designNote: product.designNote,
        features: product.features,
        usp: product.usp,
        notes: product.notes,
        rawInput: product.rawInput,
        completeness: product.completeness,
        openQuestions: product.openQuestions,
      }}
    />
  )
}
