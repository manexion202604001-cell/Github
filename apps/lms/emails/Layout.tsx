import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

// §8.3: Warm White 背景 + Charcoal テキスト + Muted Bronze の細線のみ。画像・ボタンの多用はしない
const colors = { paper: '#F3F0E9', ink: '#292723', stone: '#665F54', bronze: '#B18A68', black: '#111110' }

export const styles = {
  text: { fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", serif', fontSize: 15, lineHeight: 1.9, color: colors.ink, letterSpacing: '0.02em' },
  caption: { fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: colors.stone, letterSpacing: '0.04em' },
  link: { color: colors.ink, textDecoration: 'underline', textDecorationColor: colors.bronze },
  hr: { borderColor: colors.bronze, borderWidth: 1, margin: '24px 0' },
  heading: { fontFamily: '"Noto Serif JP", serif', fontSize: 20, fontWeight: 500, color: colors.black, letterSpacing: '0.04em', margin: '0 0 16px' },
}

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="ja">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.paper, margin: 0, padding: '32px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ ...styles.caption, letterSpacing: '0.16em', color: colors.black, fontSize: 14 }}>studio N</Text>
          <Hr style={styles.hr} />
          <Section>{children}</Section>
          <Hr style={styles.hr} />
          <Text style={styles.caption}>
            このメールは studio N 学習プラットフォームから送信されています。通知の設定は{' '}
            <Link href={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/settings/notifications`} style={styles.link}>通知設定</Link>
            から変更できます。
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
