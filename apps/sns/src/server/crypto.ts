import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** セッショントークンはDBへ生値を残さずハッシュで保存する。 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

/** 調査キャッシュ判定用の指紋(要件69)。 */
export function fingerprint(parts: (string | string[] | null | undefined)[]): string {
  const normalized = parts
    .map((part) => (Array.isArray(part) ? [...part].map((v) => v.trim().toLowerCase()).sort().join(',') : (part ?? '').trim().toLowerCase()))
    .join('|')
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32)
}
