/* eslint-disable no-console */
// supabase/seed.sql を DATABASE_URL に対して適用する（Supabase CLI が無い環境向け）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL が設定されていません。')
  const sql = postgres(url, { max: 1 })
  const file = readFileSync(resolve(process.cwd(), 'supabase/seed.sql'), 'utf8')
  await sql.unsafe(file)
  console.log('seed 完了: カテゴリ・チャンネル・XP ルール・バッジ')
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
