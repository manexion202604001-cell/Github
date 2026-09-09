import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getMemberDetail } from '@/lib/db/queries/members'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table, Td, Th } from '@/components/ui/Table'
import { DeletionActions, RoleSelect } from '@/components/admin/MemberActions'
import { formatDate, formatDateTime, LEVEL_LABEL, ROLE_LABEL } from '@/lib/utils'
import { xpToLevel } from '@/lib/xp'

export const metadata = { title: '会員詳細' }

/** ADM-04/05: 会員詳細（admin のみ） */
export default async function AdminMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await requireRole('admin')
  const { userId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound()
  const d = await getMemberDetail(userId)
  if (!d) notFound()
  const { profile: p } = d
  const lv = xpToLevel(p.totalXp)
  const rows: [string, React.ReactNode][] = [
    ['メール', <span key="e" className="font-mono">{d.email ?? '—'}</span>],
    ['ロール', p.deletedAt ? ROLE_LABEL[p.role] : <RoleSelect key="r" userId={p.id} role={p.role} isSelf={p.id === me.id} />],
    ['自己申告レベル', p.level ? LEVEL_LABEL[p.level] : '—'],
    ['XP', <span key="x" className="tnum">{p.totalXp.toLocaleString('ja-JP')} XP（Lv.{lv.level}）</span>],
    ['連続学習', <span key="s" className="tnum">{p.streakDays} 日</span>],
    ['最終ログイン', <span key="l" className="tnum">{p.lastLoginAt ? formatDateTime(p.lastLoginAt) : '—'}</span>],
    ['登録日', <span key="c" className="tnum">{formatDate(p.createdAt)}</span>],
    ['プロフィール公開', p.isPublic ? '公開' : '非公開'],
  ]

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Members"
        title={p.displayName}
        actions={<Link href="/admin/members" className="caption">会員一覧へ</Link>}
      />
      {p.deletedAt && <p className="rounded border bg-paper-200 p-4 font-sans text-[13px]">このユーザーは {formatDate(p.deletedAt)} に退会しました。</p>}
      {!p.deletedAt && p.deletionRequestedAt && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-state-warning bg-paper-200 p-4">
          <p className="font-sans text-[13px]">{formatDate(p.deletionRequestedAt)} に退会申請があります。</p>
          <DeletionActions userId={p.id} displayName={p.displayName} />
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={p.displayName} src={p.avatarUrl} size={56} />
            <div>
              <p className="font-serif text-[18px]">{p.displayName}</p>
              {p.bio && <p className="mt-1 text-[14px] text-stone-500">{p.bio}</p>}
            </div>
          </div>
          <dl className="divide-y border-y">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-4 py-3 font-sans text-[13px]">
                <dt className="caption">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="eyebrow mb-3">Badges</p>
            {d.badges.length === 0 ? (
              <p className="caption">バッジはまだありません。</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {d.badges.map((b) => (
                  <li key={b.id}>
                    <Badge variant="official" title={formatDate(b.earnedAt)}>{b.name}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <p className="eyebrow mb-3">Courses</p>
            {d.courses.length === 0 ? (
              <p className="caption">コースはありません。</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>コース</Th>
                    <Th className="w-48">進捗</Th>
                    <Th>受講開始</Th>
                    <Th>完了日</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.courses.map((c) => (
                    <tr key={c.courseId}>
                      <Td>
                        {c.title}
                        {c.status === 'draft' && <Badge variant="muted" className="ml-2">下書き</Badge>}
                      </Td>
                      <Td>
                        <ProgressBar value={c.progress} label={`${c.title} の進捗`} />
                        <p className="caption tnum mt-1">{c.completedCount} / {c.lessonCount} レッスン</p>
                      </Td>
                      <Td className="tnum whitespace-nowrap">{c.enrolledAt ? formatDate(c.enrolledAt) : '—'}</Td>
                      <Td className="tnum whitespace-nowrap">{c.completedAt ? formatDate(c.completedAt) : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
          <div>
            <p className="eyebrow mb-3">Certificates</p>
            {d.certificates.length === 0 ? (
              <p className="caption">修了証はまだありません。</p>
            ) : (
              <ul className="divide-y border-y">
                {d.certificates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 py-3 font-sans text-[13px]">
                    <span>{c.courseTitle}</span>
                    <span className="flex items-center gap-3">
                      <Link href={`/verify/${c.verifyCode}`} className="font-mono">{c.verifyCode}</Link>
                      <span className="caption tnum">{formatDate(c.issuedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
