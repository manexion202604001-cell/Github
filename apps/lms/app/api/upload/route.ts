import { NextResponse } from 'next/server'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { publicUrl, safeFileName, uploadToStorage, validateFile, validateImage, type Bucket } from '@/lib/storage'

/**
 * POST /api/upload  (multipart/form-data: file, kind = 'image' | 'avatar' | 'lesson-file')
 * 画像・添付のアップロード（MIME・サイズ・拡張子検証 → Storage）
 * 返り値: { path, url? }  url は公開バケット（avatars）のみ。uploads/lesson-files は署名付き URL を都度発行する
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  if (!checkRateLimit(`upload:${user.id}`, 30)) return NextResponse.json({ error: '操作が多すぎます。' }, { status: 429 })

  const form = await req.formData()
  const file = form.get('file')
  const kind = String(form.get('kind') ?? 'image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'ファイルがありません。' }, { status: 400 })

  let bucket: Bucket
  let error: string | null
  if (kind === 'avatar') {
    bucket = 'avatars'
    error = validateImage(file)
    if (!error && file.size > 2 * 1024 * 1024) error = 'アバター画像は 2MB 以下にしてください。'
  } else if (kind === 'lesson-file') {
    if (!isStaff(user.profile)) return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
    bucket = 'lesson-files'
    error = validateFile(file)
  } else {
    bucket = 'uploads'
    error = validateImage(file)
  }
  if (error) return NextResponse.json({ error }, { status: 400 })

  const name = safeFileName(file.name)
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${name}`
  const stored = await uploadToStorage(bucket, path, file, file.type || 'application/octet-stream')
  if (!stored) return NextResponse.json({ error: 'アップロードに失敗しました。' }, { status: 500 })
  return NextResponse.json({
    path: stored,
    url: bucket === 'avatars' ? publicUrl('avatars', stored) : null,
    fileName: file.name,
    sizeBytes: file.size,
  })
}
