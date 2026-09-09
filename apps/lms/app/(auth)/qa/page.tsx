import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { listCoursesForQa, listThreads } from '@/lib/db/queries/qa'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { QaFilters } from '@/components/qa/QaFilters'
import { QaThreadRow } from '@/components/qa/QaThreadRow'

export const metadata = { title: 'Q&A' }

export default async function QaListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string; status?: string; mine?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const filtered = !!(sp.q || sp.course || sp.status || sp.mine === 'true')
  const [threads, courses] = await Promise.all([
    listThreads(user.profile, { q: sp.q, courseId: sp.course, status: sp.status, mine: sp.mine === 'true' }),
    listCoursesForQa(),
  ])

  return (
    <div>
      <PageHeader
        eyebrow="Official Q&A"
        title="Q&A"
        description="講師が回答します。他の方の質問も学びになるため、会員全員に公開されます。受講生同士の相談はコミュニティへ。"
        actions={
          <Button asChild>
            <Link href="/qa/new">
              <PenLine />
              質問する
            </Link>
          </Button>
        }
      />
      <QaFilters courses={courses} />
      {threads.length === 0 ? (
        filtered ? (
          <EmptyState message="該当する質問はありません。" action={{ label: '絞り込みを解除', href: '/qa' }} />
        ) : (
          <EmptyState message="まだ質問はありません。" action={{ label: '最初の質問をする', href: '/qa/new' }} />
        )
      ) : (
        <ul className="mt-8 divide-y border-y">
          {threads.map((t) => (
            <QaThreadRow key={t.id} thread={t} />
          ))}
        </ul>
      )}
      <p className="caption mt-10">
        受講生同士の相談は、コミュニティの <Link href="/community/help">つまずき相談</Link> をご利用ください。
      </p>
    </div>
  )
}
