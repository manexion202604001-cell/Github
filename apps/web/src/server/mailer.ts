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
 * MVPではコンソール出力のみ。SMTP/SendGrid等のAdapterを差し込めるよう
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
      // eslint-disable-next-line no-console
      console.log(`\n--- MAIL (${message.to}) ---\n${message.subject}\n\n${message.text}\n---\n`)
    }
  }
}

let provider: MailProvider = new ConsoleMailProvider()

export function mailer(): MailProvider {
  return provider
}

export function setMailProvider(next: MailProvider): void {
  provider = next
}
