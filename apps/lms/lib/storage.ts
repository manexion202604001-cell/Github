import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const
export const FILE_EXT = ['pdf', 'zip', 'csv', 'json', 'txt', 'md', 'xlsx', 'pptx', 'docx', 'png', 'jpg', 'jpeg', 'webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_FILE_BYTES = 100 * 1024 * 1024

export type Bucket = 'avatars' | 'uploads' | 'lesson-files' | 'certificates'

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return (m?.[1] ?? '').toLowerCase()
}

export function validateImage(file: { name: string; type: string; size: number }): string | null {
  if (!(IMAGE_MIME as readonly string[]).includes(file.type)) return '画像は PNG / JPEG / WebP / GIF のみアップロードできます。'
  if (!(IMAGE_EXT as readonly string[]).includes(extensionOf(file.name))) return 'ファイルの拡張子が許可されていません。'
  if (file.size > MAX_IMAGE_BYTES) return '画像は 5MB 以下にしてください。'
  return null
}

export function validateFile(file: { name: string; type: string; size: number }): string | null {
  if (!(FILE_EXT as readonly string[]).includes(extensionOf(file.name))) return 'このファイル形式はアップロードできません。'
  if (file.size > MAX_FILE_BYTES) return 'ファイルは 100MB 以下にしてください。'
  return null
}

/** 署名付き URL（有効 1 時間、§11） */
export async function createSignedUrl(bucket: Bucket, path: string, expiresInSec = 60 * 60): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSec, {
      download: bucket === 'lesson-files' ? path.split('/').pop() : undefined,
    })
    if (error) return null
    return data.signedUrl
  } catch {
    return null
  }
}

/** Storage にアップロードし、保存パスを返す */
export async function uploadToStorage(bucket: Bucket, path: string, file: File | Blob, contentType: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.storage.from(bucket).upload(path, file, { contentType, upsert: true })
    if (error) {
      console.error('[storage] upload failed', error)
      return null
    }
    return path
  } catch (e) {
    console.error('[storage] upload failed', e)
    return null
  }
}

export function publicUrl(bucket: Bucket, path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

export function safeFileName(name: string): string {
  const ext = extensionOf(name)
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'file'
  return ext ? `${base}.${ext}` : base
}
