import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

const ALGORITHM = 'aes-256-gcm'

function keyBytes(): Buffer {
  return scryptSync(env.encryptionKey, 'manexion-product-os', 32)
}

/** Integration の API キー等をDBへ保存する際に使う(要件110)。 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, keyBytes(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload: string): string | null {
  const parts = payload.split('.')
  if (parts.length !== 3) return null
  const [ivPart, tagPart, dataPart] = parts as [string, string, string]
  try {
    const decipher = createDecipheriv(ALGORITHM, keyBytes(), Buffer.from(ivPart, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

/** セッション・検証トークンはDBへ生値を残さずハッシュで保存する。 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
