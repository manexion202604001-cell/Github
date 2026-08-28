// Vercelビルド時のDBスキーマ反映。
// DATABASE_URL 未設定でもビルドを止めず、警告を出してスキップする。
// (その場合、ログイン等のDB機能は動かない。環境変数を設定して Redeploy すること)
import { execSync } from 'node:child_process'

const url = process.env.DATABASE_URL ?? ''

// directUrl(スキーマ反映用)が未設定なら DATABASE_URL を流用する
if (!process.env.DIRECT_URL && url.trim() !== '') {
  process.env.DIRECT_URL = url
}

if (url.trim() === '') {
  console.warn('')
  console.warn('⚠️  DATABASE_URL が未設定のため、prisma db push をスキップしました。')
  console.warn('   サイトは表示されますが、ログイン・調査・企画の各機能は動作しません。')
  console.warn('   Vercel の Settings → Environment Variables に DATABASE_URL を追加し、Redeploy してください。')
  console.warn('')
  process.exit(0)
}

// 同一DBを他アプリと共有すると、db push が相手のテーブルを壊しうる。
// 専用スキーマの指定が無い場合は、意図した構成かどうかを必ず確認できるよう警告する。
if (!/[?&]schema=/.test(url)) {
  console.warn('')
  console.warn('⚠️  DATABASE_URL に schema の指定がありません。')
  console.warn('   このDBを他アプリと共有している場合、相手のテーブルを削除する可能性があります。')
  console.warn('   専用DBでない場合は、接続文字列へ ?schema=sns を付けてください。')
  console.warn('')
}

// 接続枯渇などの一時的な失敗に備えてリトライする
const MAX_ATTEMPTS = 6
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' })
    break
  } catch (error) {
    if (attempt === MAX_ATTEMPTS) throw error
    console.warn(`⚠️  prisma db push 失敗(${attempt}/${MAX_ATTEMPTS})。20秒後に再試行します…`)
    execSync('sleep 20')
  }
}
