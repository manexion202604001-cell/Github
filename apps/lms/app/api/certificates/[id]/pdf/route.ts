import { NextResponse } from 'next/server'
import { createElement, type ReactElement } from 'react'
import { eq } from 'drizzle-orm'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Font, renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { certificates } from '@/lib/db/schema'
import { getCertificateById } from '@/lib/db/queries/gamification'
import { createAdminClient } from '@/lib/supabase/admin'
import { appUrl } from '@/lib/utils'
import { buildCertificateText, certificateFileName, certificateStoragePath } from '@/lib/certificate-layout'
import { CertificatePdf, type CertificateFonts } from '@/components/gamification/CertificatePdf'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * 日本語フォント（OTF は react-pdf 対応。Google Fonts の woff2 / @fontsource の woff は不可）。
 * 一度取得したら一時ディレクトリに保存して再利用する。取得に失敗したら Helvetica（英字のみ）にフォールバック。
 */
const FONT_SOURCES = {
  serif: { family: 'NotoSerifJP', url: 'https://github.com/googlefonts/noto-cjk/raw/main/Serif/OTF/Japanese/NotoSerifJP-Regular.otf', file: 'NotoSerifJP-Regular.otf' },
  sans: { family: 'NotoSansJP', url: 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansJP-Regular.otf', file: 'NotoSansJP-Regular.otf' },
} as const

const registered = new Set<string>()

async function ensureFont(kind: keyof typeof FONT_SOURCES): Promise<string | null> {
  const src = FONT_SOURCES[kind]
  if (registered.has(src.family)) return src.family
  try {
    const dir = join(tmpdir(), 'studio-n-fonts')
    const path = join(dir, src.file)
    const cached = await stat(path).then((s) => s.size > 0).catch(() => false)
    if (!cached) {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' })
      if (!res.ok) throw new Error(`font fetch failed: ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(dir, { recursive: true })
      await writeFile(path, buf)
    }
    Font.register({ family: src.family, src: path })
    registered.add(src.family)
    return src.family
  } catch (e) {
    console.warn(`[certificate] ${src.family} を読み込めませんでした。`, e instanceof Error ? e.message : e)
    return null
  }
}

async function resolveFonts(): Promise<{ fonts: CertificateFonts; japanese: boolean }> {
  const serif = await ensureFont('serif')
  if (!serif) return { fonts: { serif: 'Helvetica', sans: 'Helvetica' }, japanese: false }
  const sans = (await ensureFont('sans')) ?? serif
  return { fonts: { serif, sans }, japanese: true }
}

function pdfResponse(body: Uint8Array, verifyCode: string) {
  // Uint8Array<ArrayBufferLike> は BodyInit に渡せないため ArrayBuffer にコピーする
  const ab = new ArrayBuffer(body.byteLength)
  new Uint8Array(ab).set(body)
  return new NextResponse(ab, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificateFileName(verifyCode)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

/** GAME-04: 修了証 PDF（本人 or admin）。初回生成後は Storage `certificates` にキャッシュ */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const cert = await getCertificateById(id)
  if (!cert) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (cert.userId !== user.id && !hasRole(user.profile, 'admin')) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const admin = createAdminClient()
  const bucket = admin.storage.from('certificates')

  // キャッシュ済みならそれを返す
  if (cert.pdfPath) {
    const { data, error } = await bucket.download(cert.pdfPath)
    if (!error && data) return pdfResponse(new Uint8Array(await data.arrayBuffer()), cert.verifyCode)
  }

  const { fonts, japanese } = await resolveFonts()
  const text = buildCertificateText({
    recipientName: cert.recipientName,
    courseTitle: cert.courseTitle,
    issuedAt: cert.issuedAt,
    verifyCode: cert.verifyCode,
    verifyUrl: appUrl(`/verify/${cert.verifyCode}`),
    japanese,
  })
  let buffer: Buffer
  try {
    // renderToBuffer は <Document> の props 型を要求するため、ルート要素が Document であるコンポーネントをキャストして渡す
    const doc = createElement(CertificatePdf, { text, fonts }) as unknown as ReactElement<DocumentProps>
    buffer = await renderToBuffer(doc)
  } catch (e) {
    console.error('[certificate] PDF の生成に失敗しました。', e)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  // Storage にキャッシュ（失敗しても PDF 自体は返す。日本語フォントが使えなかった場合はキャッシュしない）
  if (japanese) {
    const path = certificateStoragePath(cert.userId, cert.id)
    const { error } = await bucket.upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (!error) {
      await db.update(certificates).set({ pdfPath: path }).where(eq(certificates.id, cert.id))
    } else {
      console.warn('[certificate] キャッシュの保存に失敗しました。', error.message)
    }
  }
  return pdfResponse(new Uint8Array(buffer), cert.verifyCode)
}
