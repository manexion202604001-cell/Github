import { fetchOgp } from '@/lib/ogp'

/** COM-02: 本文中の最初の URL の OGP プレビュー（Server Component。取得失敗時は何も表示しない） */
export async function LinkPreview({ url }: { url: string }) {
  const ogp = await fetchOgp(url)
  if (!ogp) return null
  let host = ''
  try {
    host = new URL(ogp.url || url).hostname
  } catch {
    host = ''
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex max-w-prose overflow-hidden rounded border bg-paper-100 no-underline transition-colors hover:border-bronze-500 hover:text-ink-700"
    >
      {ogp.image && (
        <span className="hidden w-40 shrink-0 border-r sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element -- 外部 OGP 画像は next/image の最適化対象外 */}
          <img src={ogp.image} alt="" className="size-full object-cover" loading="lazy" style={{ filter: 'saturate(0.7)' }} />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1 p-4">
        <span className="caption truncate">{ogp.siteName ?? host}</span>
        <span className="line-clamp-2 font-serif text-[15px] leading-[1.6] text-ink-900">{ogp.title}</span>
        {ogp.description && <span className="line-clamp-2 text-[13px] leading-[1.7] text-stone-500">{ogp.description}</span>}
      </span>
    </a>
  )
}
