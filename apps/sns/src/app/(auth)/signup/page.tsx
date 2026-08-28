import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: '新規登録' }

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard')
  return <SignupForm />
}
