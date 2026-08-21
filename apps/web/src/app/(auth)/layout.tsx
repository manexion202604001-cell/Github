import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md border border-line bg-surface p-8">{children}</div>
    </div>
  )
}
