import { requireUser } from '@/lib/auth'
import { listMyCertificates } from '@/lib/db/queries/gamification'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CertificateCard } from '@/components/gamification/CertificateCard'

export const metadata = { title: '修了証' }

/** GAME-04: 修了証一覧 */
export default async function CertificatesPage() {
  const user = await requireUser()
  const certs = await listMyCertificates(user.id)
  return (
    <div>
      <PageHeader eyebrow="Certificates" title="修了証" description="コースを修了すると自動で発行されます。検証コードで真正性を確認できます。" />
      {certs.length === 0 ? (
        <EmptyState message="まだ修了証はありません。" action={{ label: 'コースを見る', href: '/courses' }} />
      ) : (
        <div className="grid gap-4">
          {certs.map((c) => (
            <CertificateCard key={c.id} cert={c} />
          ))}
        </div>
      )}
    </div>
  )
}
