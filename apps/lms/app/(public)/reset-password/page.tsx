import { AuthShell } from '@/components/layout/AuthShell'
import { ResetForm, UpdatePasswordForm } from './ResetForms'

export const metadata = { title: 'パスワードリセット' }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams
  if (step === 'update') {
    return (
      <AuthShell title="新しいパスワード" eyebrow="Reset password">
        <UpdatePasswordForm />
      </AuthShell>
    )
  }
  return (
    <AuthShell title="パスワードリセット" eyebrow="Reset password">
      <ResetForm />
    </AuthShell>
  )
}
