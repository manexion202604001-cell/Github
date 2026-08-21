import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/server/auth/session'
import { previewInvite } from '@/features/organizations/service'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/feedback'
import { AcceptInviteButton } from './accept-button'

export const metadata: Metadata = { title: '組織への招待' }
export const dynamic = 'force-dynamic'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const user = await getCurrentUser()

  let content: React.ReactNode
  if (!token) {
    content = <Notice tone="error">招待リンクが不正です。メールに記載されたリンクをそのまま開いてください。</Notice>
  } else {
    try {
      const invite = await previewInvite(token)
      if (!user) {
        content = (
          <div className="space-y-4">
            <p className="text-[14px] leading-relaxed text-ink-muted">
              <span className="font-bold text-ink">{invite.organizationName}</span> から{' '}
              <span className="font-bold text-ink">{invite.email}</span> 宛に招待が届いています。
              参加するには、このメールアドレスでログイン(または新規登録)してから、もう一度このリンクを開いてください。
            </p>
            <div className="flex gap-3">
              <Link href="/login">
                <Button>ログイン</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary">新規登録</Button>
              </Link>
            </div>
          </div>
        )
      } else {
        content = (
          <div className="space-y-4">
            <p className="text-[14px] leading-relaxed text-ink-muted">
              <span className="font-bold text-ink">{invite.organizationName}</span> のメンバー(
              {invite.role})として招待されています。
            </p>
            {user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <Notice tone="warning">
                この招待は {invite.email} 宛です。現在 {user.email} でログインしています。
                招待されたアドレスのアカウントでログインし直してください。
              </Notice>
            ) : (
              <AcceptInviteButton token={token} />
            )}
          </div>
        )
      }
    } catch (error) {
      content = (
        <Notice tone="error">
          {error instanceof Error ? error.message : '招待リンクが無効か、有効期限が切れています'}
        </Notice>
      )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md border border-line bg-surface p-8">
        <h1 className="mb-4 text-lg font-bold">組織への招待</h1>
        {content}
      </div>
    </div>
  )
}
