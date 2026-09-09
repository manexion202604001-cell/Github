import type { Metadata, Viewport } from 'next'
import { Shippori_Mincho, Noto_Sans_JP, JetBrains_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from '@/components/ui/Toaster'
import './globals.css'

const serif = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-serif',
  preload: false,
})
const sans = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-sans',
  preload: false,
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-mono',
  preload: false,
})

export const metadata: Metadata = {
  title: { default: 'studio N', template: '%s | studio N' },
  description: 'studio N のコミュニティ型学習プラットフォーム',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'),
}

export const viewport: Viewport = {
  themeColor: '#111110',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper-100">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </body>
    </html>
  )
}
