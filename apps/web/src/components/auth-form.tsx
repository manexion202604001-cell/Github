'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'

function useSubmit() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (action: () => Promise<void>) => {
    setError(null)
    setLoading(true)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  return { error, loading, submit }
}

function GoogleButton() {
  return (
    <a
      href="/api/auth/google"
      className="flex h-10 w-full items-center justify-center gap-2 border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:bg-canvas-alt"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-6.9-5.1H1.2v3.1C3.2 21.3 7.3 24 12 24Z" />
        <path fill="#FBBC05" d="M5.1 14.2a7 7 0 0 1 0-4.4v-3H1.2a11.9 11.9 0 0 0 0 10.6l3.9-3.2Z" />
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.5l2.7-2.7C16.9 1.9 14.2.8 12 .8 7.3.8 3.2 3.5 1.2 7.7l3.9 3.1c1-3 3.7-6.1 6.9-6.1Z" />
      </svg>
      Googleでログイン
    </a>
  )
}

export function LoginForm() {
  const router = useRouter()
  const { error, loading, submit } = useSubmit()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void submit(async () => {
      await api('/api/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      })
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="mt-1 text-[13px] text-ink-muted">おかえりなさい。商品開発を続けましょう。</p>
      </div>
      <Suspense fallback={null}>
        <OAuthErrorNotice />
      </Suspense>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="メールアドレス" required>
          <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field label="パスワード" required>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          ログイン
        </Button>
      </form>
      <GoogleButton />
      <div className="flex items-center justify-between text-[13px]">
        <Link href="/forgot-password" className="text-ink-muted hover:text-brand">
          パスワードをお忘れですか?
        </Link>
        <Link href="/signup" className="font-semibold text-brand">
          新規登録
        </Link>
      </div>
    </div>
  )
}

function OAuthErrorNotice() {
  const params = useSearchParams()
  if (params.get('error') !== 'oauth') return null
  return <Notice tone="error">Googleログインに失敗しました。もう一度お試しください。</Notice>
}

export function SignupForm() {
  const router = useRouter()
  const { error, loading, submit } = useSubmit()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void submit(async () => {
      await api('/api/auth/signup', {
        method: 'POST',
        body: {
          email: form.get('email'),
          password: form.get('password'),
          name: form.get('name') || undefined,
          organizationName: form.get('organizationName') || undefined,
        },
      })
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">アカウント作成</h1>
        <p className="mt-1 text-[13px] text-ink-muted">登録後すぐに最初のプロジェクトを作成できます。</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="お名前">
          <Input name="name" autoComplete="name" placeholder="山田 太郎" />
        </Field>
        <Field label="組織名" hint="法人でない場合は空欄で構いません">
          <Input name="organizationName" autoComplete="organization" placeholder="株式会社〇〇" />
        </Field>
        <Field label="メールアドレス" required>
          <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field label="パスワード" required hint="10文字以上、英字と数字を含めてください">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          無料で始める
        </Button>
      </form>
      <GoogleButton />
      <p className="text-center text-[13px] text-ink-muted">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="font-semibold text-brand">
          ログイン
        </Link>
      </p>
    </div>
  )
}

export function ForgotPasswordForm() {
  const { error, loading, submit } = useSubmit()
  const [sent, setSent] = useState(false)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void submit(async () => {
      await api('/api/auth/password-reset', { method: 'POST', body: { email: form.get('email') } })
      setSent(true)
    })
  }

  if (sent) {
    return (
      <Notice tone="success" title="メールを送信しました">
        入力されたアドレスが登録済みの場合、パスワード再設定用のリンクをお送りしています。
      </Notice>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">パスワード再設定</h1>
        <p className="mt-1 text-[13px] text-ink-muted">登録済みのメールアドレスに再設定リンクを送ります。</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="メールアドレス" required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          再設定リンクを送る
        </Button>
      </form>
      <p className="text-center text-[13px]">
        <Link href="/login" className="text-ink-muted hover:text-brand">
          ログインへ戻る
        </Link>
      </p>
    </div>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const { error, loading, submit } = useSubmit()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void submit(async () => {
      await api('/api/auth/password-reset', {
        method: 'PUT',
        body: { token, password: form.get('password') },
      })
      router.push('/login')
    })
  }

  if (!token) return <Notice tone="error">リンクが無効です。もう一度メールからやり直してください。</Notice>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">新しいパスワード</h1>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="新しいパスワード" required hint="10文字以上、英字と数字を含めてください">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          パスワードを変更する
        </Button>
      </form>
    </div>
  )
}

export function VerifyEmailPanel() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle')
  const { loading, submit } = useSubmit()

  const verify = () => {
    void submit(async () => {
      try {
        await api('/api/auth/verify-email', { method: 'POST', body: { token } })
        setState('ok')
      } catch {
        setState('error')
      }
    })
  }

  if (!token) return <Notice tone="error">確認リンクが無効です。</Notice>
  if (state === 'ok') {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="メールアドレスを確認しました" />
        <Link href="/dashboard">
          <Button className="w-full">ダッシュボードへ</Button>
        </Link>
      </div>
    )
  }
  if (state === 'error') return <Notice tone="error">リンクが無効か、有効期限が切れています。</Notice>

  return (
    <div className="space-y-5 text-center">
      <h1 className="text-xl font-bold">メールアドレスの確認</h1>
      <p className="text-[13px] text-ink-muted">下のボタンを押して確認を完了してください。</p>
      <Button onClick={verify} loading={loading} className="w-full">
        確認する
      </Button>
    </div>
  )
}
