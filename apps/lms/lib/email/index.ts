import 'server-only'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import type { ReactElement } from 'react'

let client: Resend | null = null
function getClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  client ??= new Resend(key)
  return client
}

/**
 * メール送信。RESEND_API_KEY 未設定時はログ出力のみ（開発環境で全機能が動くように）。
 */
export async function sendEmail(input: { to: string | string[]; subject: string; react: ReactElement }) {
  const resend = getClient()
  const from = process.env.EMAIL_FROM ?? 'studio N <noreply@studio-n.example>'
  if (!resend) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[email:dry-run] to=${Array.isArray(input.to) ? input.to.join(',') : input.to} subject=${input.subject}`)
    }
    return { ok: true as const, id: null }
  }
  try {
    const html = await render(input.react)
    const { data, error } = await resend.emails.send({ from, to: input.to, subject: input.subject, html })
    if (error) {
      console.error('[email] send failed', error)
      return { ok: false as const, error: error.message }
    }
    return { ok: true as const, id: data?.id ?? null }
  } catch (e) {
    console.error('[email] send failed', e)
    return { ok: false as const, error: e instanceof Error ? e.message : 'unknown' }
  }
}
