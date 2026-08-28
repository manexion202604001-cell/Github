import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

// 英数字は Inter、日本語は Noto Sans JP(要件73)。
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const notoSansJp = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-noto-sans-jp', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'SNS COMPASS — 企業SNSの企画・市場調査AI',
    template: '%s | SNS COMPASS',
  },
  description:
    '市場調査・競合分析・企画立案・台本作成・動画生成AI用プロンプトまで。企業SNSの「何を発信するか」を決めるワークスペース。',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#071a3b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
