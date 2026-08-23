// Vercelビルド時のDBスキーマ反映。
// DATABASE_URL 未設定でもビルドを止めず、警告を出してスキップする。
// (その場合、ログイン等のDB機能は動かない。環境変数設定後に Redeploy すること)
import { execSync } from 'node:child_process'

const url = process.env.DATABASE_URL ?? ''

// directUrl(スキーマ反映用)が未設定なら DATABASE_URL を流用する
if (!process.env.DIRECT_URL && url.trim() !== '') {
  process.env.DIRECT_URL = url
}

if (url.trim() === '') {
  console.warn('')
  console.warn('⚠️  DATABASE_URL が未設定のため、prisma db push をスキップしました。')
  console.warn('   サイトは表示されますが、ログイン・プロジェクト機能は動作しません。')
  console.warn('   Vercel の Settings → Environment Variables に DATABASE_URL を追加し、Redeploy してください。')
  console.warn('   手順: docs/01-deploy-vercel.md')
  console.warn('')
  process.exit(0)
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
