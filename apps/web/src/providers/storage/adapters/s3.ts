import { createHash, createHmac } from 'node:crypto'
import type { PutInput, StorageProvider, StoredObject } from '../types'

export type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

/**
 * S3互換ストレージ(AWS S3 / R2 / MinIO 等)。
 * SDKを持ち込まず SigV4 を直接組み立てることで依存を最小化している。
 */
export class S3StorageProvider implements StorageProvider {
  readonly id = 's3'

  constructor(private readonly config: S3Config) {}

  isConfigured(): boolean {
    const { endpoint, bucket, accessKeyId, secretAccessKey } = this.config
    return Boolean(endpoint && bucket && accessKeyId && secretAccessKey)
  }

  private objectUrl(key: string): string {
    return `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
  }

  async put(input: PutInput): Promise<StoredObject> {
    const url = this.objectUrl(input.key)
    const headers = this.sign('PUT', url, input.body, {
      'content-type': input.contentType,
      ...(input.cacheControl ? { 'cache-control': input.cacheControl } : {}),
    })

    const response = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(input.body) })
    if (!response.ok) {
      throw new Error(`S3 put failed: ${response.status} ${await response.text().catch(() => '')}`)
    }

    const publicBase = this.config.publicBaseUrl.replace(/\/$/, '')
    return {
      key: input.key,
      url: publicBase ? `${publicBase}/${input.key}` : url,
      size: input.body.byteLength,
      contentType: input.contentType,
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    const url = this.objectUrl(key)
    const response = await fetch(url, { headers: this.sign('GET', url, Buffer.alloc(0), {}) })
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    return { body: buffer, contentType: response.headers.get('content-type') ?? 'application/octet-stream' }
  }

  async delete(key: string): Promise<void> {
    const url = this.objectUrl(key)
    await fetch(url, { method: 'DELETE', headers: this.sign('DELETE', url, Buffer.alloc(0), {}) })
  }

  async signedUrl(key: string): Promise<string> {
    const publicBase = this.config.publicBaseUrl.replace(/\/$/, '')
    return publicBase ? `${publicBase}/${key}` : this.objectUrl(key)
  }

  private sign(
    method: string,
    url: string,
    body: Buffer,
    extraHeaders: Record<string, string>,
  ): Record<string, string> {
    const parsed = new URL(url)
    const now = new Date()
    const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '')}`
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = createHash('sha256').update(body).digest('hex')

    const headers: Record<string, string> = {
      ...extraHeaders,
      host: parsed.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }

    const sortedKeys = Object.keys(headers).sort()
    const canonicalHeaders = sortedKeys.map((key) => `${key}:${headers[key]?.trim() ?? ''}\n`).join('')
    const signedHeaders = sortedKeys.join(';')

    const canonicalRequest = [
      method,
      parsed.pathname,
      parsed.searchParams.toString(),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const scope = `${dateStamp}/${this.config.region || 'auto'}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n')

    const kDate = createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(dateStamp).digest()
    const kRegion = createHmac('sha256', kDate).update(this.config.region || 'auto').digest()
    const kService = createHmac('sha256', kRegion).update('s3').digest()
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

    return {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    }
  }
}
