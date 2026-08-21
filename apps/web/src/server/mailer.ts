import 'server-only'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export type MailMessage = {
  to: string
  subject: string
  text: string
}

/**
 * メール送信のポート。
 * MAIL_PROVIDER=resend + RESEND_API_KEY で実送信、未設定時はログ出力のみ。
 * ここ以外に送信処理を書かない。
 */
export interface MailProvider {
  send(message: MailMessage): Promise<void>
}

class ConsoleMailProvider implements MailProvider {
  async send(message: MailMessage): Promise<void> {
    logger.info('mail.send', { to: message.to, subject: message.subject })
    if (!env.isProduction) {
      // 開発中はリンクをそのまま確認できるようにする。
      console.log(`\n--- MAIL (${message.to}) ---\n${message.subject}\n\n${message.text}\n---\n`)
    }
  }
}

class ResendMailProvider implements MailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      logger.error('mail.send_failed', { status: response.status, detail: detail.slice(0, 300) })
      // 送信失敗でも業務処理(登録など)は止めない。ログに残して継続する。
      return
    }
    logger.info('mail.sent', { to: message.to, subject: message.subject })
  }
}

let provider: MailProvider | null = null

export function mailer(): MailProvider {
  if (!provider) {
    provider =
      env.mail.provider === 'resend' && env.mail.resendApiKey
        ? new ResendMailProvider(env.mail.resendApiKey, env.mail.from)
        : new ConsoleMailProvider()
  }
  return provider
}

export function setMailProvider(next: MailProvider): void {
  provider = next
}
