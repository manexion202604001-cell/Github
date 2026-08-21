import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import type { PutInput, StorageProvider, StoredObject } from '../types'

/**
 * 開発・オンプレ向けのファイルシステムStorage。
 * 配信は /api/files/[...key] 経由で行い、権限チェックを必ず通す(要件110)。
 */
export class LocalStorageProvider implements StorageProvider {
  readonly id = 'local'
  private readonly root: string

  constructor(directory: string) {
    this.root = resolve(process.cwd(), directory)
  }

  isConfigured(): boolean {
    return true
  }

  private pathFor(key: string): string {
    const target = resolve(this.root, normalize(key).replace(/^(\.\.(\/|\\|$))+/, ''))
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error('invalid storage key')
    }
    return target
  }

  async put(input: PutInput): Promise<StoredObject> {
    const path = this.pathFor(input.key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, input.body)
    await writeFile(`${path}.meta.json`, JSON.stringify({ contentType: input.contentType }), 'utf8')
    return {
      key: input.key,
      url: `/api/files/${input.key.split('/').map(encodeURIComponent).join('/')}`,
      size: input.body.byteLength,
      contentType: input.contentType,
    }
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const path = this.pathFor(key)
      const body = await readFile(path)
      const meta = await readFile(`${path}.meta.json`, 'utf8').catch(() => '{}')
      const parsed = JSON.parse(meta) as { contentType?: string }
      return { body, contentType: parsed.contentType ?? 'application/octet-stream' }
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.pathFor(key)
    await rm(path, { force: true })
    await rm(`${path}.meta.json`, { force: true })
  }

  async signedUrl(key: string): Promise<string> {
    return `/api/files/${key.split('/').map(encodeURIComponent).join('/')}`
  }

  /** テスト用: 実体パスを返す。 */
  resolveKey(key: string): string {
    return join(this.root, key)
  }
}
