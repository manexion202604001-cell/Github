import Link from 'next/link'
import { AuthShell } from '@/components/layout/AuthShell'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'ログイン' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  const sp = await searchParams
  return (
    <AuthShell title="ログイン" eyebrow="Sign in">
      {sp.registered && <p className="mb-6 font-serif text-[15px] text-state-success">登録が完了しました。ログインしてください。</p>}
      <LoginForm next={sp.next ?? ''} />
      <p className="caption mt-8">
        <Link href="/reset-password">パスワードをお忘れの方</Link>
      </p>
    </AuthShell>
  )
}
