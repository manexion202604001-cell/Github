import { listImages, imageProviderStatus } from '@/features/images/service'
import { ImagesWorkspace } from './images-workspace'

/** STEP 2: コンセプト3案 → アンカー → 8方向360度 → 画像種類 → 編集(要件14〜20)。 */
export default async function ImagesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [images, provider] = await Promise.all([listImages(projectId), imageProviderStatus(projectId)])

  // 現行コンセプトセットに保存されたAI設計図(コンセプト名・要約)をカード表示用に渡す
  const conceptSet = images.sets.find((set) => set.kind === 'CONCEPT' && set.isCurrent)
  const conceptMeta =
    conceptSet?.metadata && typeof conceptSet.metadata === 'object'
      ? (conceptSet.metadata as { plans?: { variant?: string; conceptName?: string; summary?: string }[] })
      : null
  const conceptPlans = Array.isArray(conceptMeta?.plans)
    ? conceptMeta.plans
        .filter((plan) => typeof plan?.variant === 'string')
        .map((plan) => ({
          variant: plan.variant as string,
          conceptName: typeof plan.conceptName === 'string' ? plan.conceptName : '',
          summary: typeof plan.summary === 'string' ? plan.summary : '',
        }))
    : []

  const toView = (image: {
    id: string
    url: string
    type: string
    angle: string | null
    variant: string | null
    isAnchor: boolean
    prompt: string | null
    createdAt: Date
  }) => ({
    id: image.id,
    url: image.url,
    type: image.type,
    angle: image.angle,
    variant: image.variant,
    isAnchor: image.isAnchor,
    prompt: image.prompt,
  })

  return (
    <ImagesWorkspace
      projectId={projectId}
      synthetic={provider.synthetic}
      conceptPlans={conceptPlans}
      concepts={images.concepts.map(toView)}
      anchor={images.anchor ? toView(images.anchor) : null}
      angles={images.angles.map(toView)}
      others={images.others.map(toView)}
    />
  )
}
