/* eslint-disable no-console */
// supabase/migrations/*.sql を順に DATABASE_URL に適用する（Supabase CLI が無い環境向け）。
// 適用済みは public.schema_migrations（自前）で管理。
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL が設定されていません。')
  const sql = postgres(url, { max: 1 })
  await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`
  const dir = resolve(process.cwd(), 'supabase/migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const applied = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name as string))
  for (const f of files) {
    if (applied.has(f)) continue
    console.log(`applying ${f}`)
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(resolve(dir, f), 'utf8'))
      await tx`insert into public.schema_migrations (name) values (${f})`
    })
  }
  console.log('migrate 完了')
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
