import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

const ALGORITHM = 'aes-256-gcm'

function keyBytes(secret: string = env.encryptionKey): Buffer {
  return scryptSync(secret, 'manexion-product-os', 32)
}

/**
 * ENCRYPTION_KEY 未設定期間に既定キーで暗号化されたデータの救済用。
 * 復号のみに使用し、新規の暗号化には決して使わない。
 */
const LEGACY_DEV_KEY = 'insecure-development-encryption-key'

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

  const tryKey = (key: Buffer): string | null => {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64url'))
      decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
      return Buffer.concat([
        decipher.update(Buffer.from(dataPart, 'base64url')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      return null
    }
  }

  const current = tryKey(keyBytes())
  if (current !== null) return current
  // ENCRYPTION_KEY 設定前に保存されたデータのフォールバック(読み出しのみ)
  return tryKey(keyBytes(LEGACY_DEV_KEY))
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
