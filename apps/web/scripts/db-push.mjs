// Vercelビルド時のDBスキーマ反映。
// DATABASE_URL 未設定でもビルドを止めず、警告を出してスキップする。
// (その場合、ログイン等のDB機能は動かない。環境変数設定後に Redeploy すること)
import { execSync } from 'node:child_process'

const url = process.env.DATABASE_URL ?? ''

if (url.trim() === '') {
  console.warn('')
  console.warn('⚠️  DATABASE_URL が未設定のため、prisma db push をスキップしました。')
  console.warn('   サイトは表示されますが、ログイン・プロジェクト機能は動作しません。')
  console.warn('   Vercel の Settings → Environment Variables に DATABASE_URL を追加し、Redeploy してください。')
  console.warn('   手順: docs/01-deploy-vercel.md')
  console.warn('')
  process.exit(0)
}

execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' })
