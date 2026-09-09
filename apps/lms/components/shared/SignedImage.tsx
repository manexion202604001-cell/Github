import { createSignedUrl } from '@/lib/storage'

/** uploads バケットの画像を署名付き URL で表示（Server Component） */
export async function SignedImage({ path, alt = '', className }: { path: string; alt?: string; className?: string }) {
  const url = await createSignedUrl('uploads', path)
  if (!url) return null
  // eslint-disable-next-line @next/next/no-img-element -- 署名付き URL(1h) は next/image の最適化対象外
  return <img src={url} alt={alt} className={className} loading="lazy" style={{ filter: 'saturate(0.7)' }} />
}
