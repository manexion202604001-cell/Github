import type { PutInput, StorageProvider, StoredObject } from '../types'

export type SupabaseStorageConfig = {
  /** 例 https://xxxx.supabase.co */
  url: string
  /** service_role キー。サーバー専用(要件110)。 */
  serviceRoleKey: string
  bucket: string
}

/**
 * Supabase Storage。Vercel等のサーバーレス環境では
 * ローカルディスクが揮発するため、こちらを使用する。
 * バケットは Public に設定し、配信は公開URLで行う。
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly id = 'supabase'

  constructor(private readonly config: SupabaseStorageConfig) {}

  isConfigured(): boolean {
    const { url, serviceRoleKey, bucket } = this.config
    return Boolean(url && serviceRoleKey && bucket)
  }

  private objectUrl(key: string): string {
    const base = this.config.url.replace(/\/$/, '')
    const path = key.split('/').map(encodeURIComponent).join('/')
    return `${base}/storage/v1/object/${this.config.bucket}/${path}`
  }

  private publicUrl(key: string): string {
    const base = this.config.url.replace(/\/$/, '')
    const path = key.split('/').map(encodeURIComponent).join('/')
    return `${base}/storage/v1/object/public/${this.config.bucket}/${path}`
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      authorization: `Bearer ${this.config.serviceRoleKey}`,
      apikey: this.config.serviceRoleKey,
      ...extra,
    }
  }

  async put(input: PutInput): Promise<StoredObject> {
    const response = await fetch(this.objectUrl(input.key), {
      method: 'POST',
      headers: this.headers({
        'content-type': input.contentType,
        'x-upsert': 'true',
        ...(input.cacheControl ? { 'cache-control': input.cacheControl } : {}),
      }),
      body: new Uint8Array(input.body),
    })
    if (!response.ok) {
      throw new Error(`Supabase Storage put failed: ${response.status} ${await response.text().catch(() => '')}`)
    }
    return {
      key: input.key,
      url: this.publicUrl(input.key),
      size: input.body.byteLength,
      contentType: input.contentType,
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    const response = await fetch(this.objectUrl(key), { headers: this.headers() })
    if (!response.ok) return null
    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }

  async delete(key: string): Promise<void> {
    await fetch(this.objectUrl(key), { method: 'DELETE', headers: this.headers() })
  }

  async signedUrl(key: string): Promise<string> {
    return this.publicUrl(key)
  }
}
