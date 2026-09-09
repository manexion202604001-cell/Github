import Link from 'next/link'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations } from '@/lib/db/schema'
import { AuthShell } from '@/components/layout/AuthShell'
import { SignupForm } from './SignupForm'

export const metadata = { title: '登録' }

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const invitation = token
    ? await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), isNull(invitations.usedAt), gt(invitations.expiresAt, new Date())),
        columns: { email: true },
      })
    : null

  return (
    <AuthShell title="登録" eyebrow="Sign up">
      {!invitation || !token ? (
        <div className="space-y-6">
          <p className="font-serif">この招待リンクは無効か、有効期限が切れています。</p>
          <p className="caption">studio N にお問い合わせのうえ、新しい招待をお受け取りください。</p>
          <Link href="/login" className="ui-label">ログインへ</Link>
        </div>
      ) : (
        <SignupForm token={token} email={invitation.email} />
      )}
    </AuthShell>
  )
}
