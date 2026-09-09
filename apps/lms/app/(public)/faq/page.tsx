export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFaqVisibility, listFaqThreads } from '@/lib/db/queries/qa'
import { Badge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'FAQ' }

/** §5.10 /faq: Q&A から FAQ 化されたもの（質問者名は出さず、公式回答のみ表示） */
export default async function FaqPage() {
  // TODO(decision-#6): FAQ の公開範囲（一般公開 / 会員限定）は未決。app_settings.faq_visibility で切替（既定 'public'）
  const [visibility, user] = await Promise.all([getFaqVisibility(), getCurrentUser()])
  if (visibility === 'members' && !user) redirect('/login?next=/faq')
  const items = await listFaqThreads()

  return (
    <>
      <header className="dark-surface bg-ink-900 px-6 py-6 text-paper-100">
        <div className="mx-auto flex max-w-container items-center justify-between">
          <Link href="/" className="font-serif tracking-widest text-paper-100 no-underline hover:text-paper-100">studio N</Link>
          <Link href={user ? '/qa' : '/login'} className="ui-label text-paper-100/70 no-underline hover:text-bronze-400">
            {user ? 'Q&A へ' : 'ログイン'}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-prose px-6 py-16 md:py-24">
        <p className="eyebrow mb-2">FAQ</p>
        <h1 className="mb-3">よくある質問</h1>
        <p className="mb-12 text-[15px] text-stone-500">受講生から寄せられた質問のうち、講師が公式に回答したものをまとめています。</p>
        {items.length === 0 ? (
          <p className="py-16 text-center font-serif text-ink-700">FAQ はまだありません。</p>
        ) : (
          <ul className="divide-y border-y">
            {items.map((item) => (
              <li key={item.id} className="py-10">
                <article>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {item.courseTitle && <Badge>{item.courseTitle}</Badge>}
                    <span className="caption tnum">{formatDate(item.updatedAt)}</span>
                  </div>
                  <h2 className="text-[20px] md:text-[22px]">
                    <span className="mr-2 text-bronze-500">Q.</span>
                    {item.title}
                  </h2>
                  <Markdown className="mt-4 text-[15px]">{item.bodyMd}</Markdown>
                  <div className="mt-8 space-y-6">
                    {item.answers.map((a) => (
                      <div key={a.id} className="rounded border border-bronze-500 bg-paper-200 p-5 md:p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <Badge variant="official">公式回答</Badge>
                          <span className="caption">{a.replierName}</span>
                        </div>
                        <Markdown>{a.bodyMd}</Markdown>
                      </div>
                    ))}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
        <p className="caption mt-12">
          {user ? (
            <>
              解決しない場合は <Link href="/qa/new">Q&A で質問</Link> してください。
            </>
          ) : (
            <>
              会員の方は <Link href="/login?next=/qa">ログイン</Link> すると Q&A で講師に質問できます。
            </>
          )}
        </p>
      </main>
      <PublicFooter />
    </>
  )
}
