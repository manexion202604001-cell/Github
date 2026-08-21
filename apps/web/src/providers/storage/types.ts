import type { Provider } from '../types'

export type StoredObject = {
  key: string
  url: string
  size: number
  contentType: string
}

export type PutInput = {
  key: string
  body: Buffer
  contentType: string
  cacheControl?: string
}

export interface StorageProvider extends Provider {
  put(input: PutInput): Promise<StoredObject>
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>
  delete(key: string): Promise<void>
  /** 署名付きURL。公開バケットの場合は通常のURLを返してよい。 */
  signedUrl(key: string, expiresInSeconds?: number): Promise<string>
}

/** 衝突しないオブジェクトキーを組み立てる。 */
export function buildKey(parts: (string | number)[], extension: string): string {
  const safe = parts.map((part) => String(part).replace(/[^a-zA-Z0-9._-]/g, '_'))
  return `${safe.join('/')}.${extension.replace(/^\./, '')}`
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'video/mp4':
      return 'mp4'
    case 'application/pdf':
      return 'pdf'
    case 'application/json':
      return 'json'
    case 'text/html':
      return 'html'
    case 'text/csv':
      return 'csv'
    default:
      return 'bin'
  }
}
