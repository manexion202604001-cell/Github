import { listImages } from '@/features/images/service'
import { imageProviders } from '@/providers/image'
import { ImagesWorkspace } from './images-workspace'

/** STEP 2: コンセプト3案 → アンカー → 8方向360度 → 画像種類 → 編集(要件14〜20)。 */
export default async function ImagesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const images = await listImages(projectId)
  const provider = imageProviders().get()

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
      concepts={images.concepts.map(toView)}
      anchor={images.anchor ? toView(images.anchor) : null}
      angles={images.angles.map(toView)}
      others={images.others.map(toView)}
    />
  )
}
