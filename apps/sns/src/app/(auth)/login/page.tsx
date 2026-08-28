import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'ログイン' }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard')
  return <LoginForm />
}
