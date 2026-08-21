import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'UCCHAU | AI商品開発OS', template: '%s | UCCHAU' },
  description:
    '商品アイデアの入力から、AI商品画像生成・市場調査・競合分析・利益シミュレーション・OEM仕様書・LP・PR動画・販売後改善までを一気通貫で支援する商品開発プラットフォーム。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#26211e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
