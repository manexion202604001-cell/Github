import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from './index'

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Tx = DbTx

/**
 * RLS を効かせた状態でクエリを実行する。
 * Postgres の `authenticated` / `anon` ロールに切り替え、`request.jwt.claims` を設定するため
 * Supabase の `auth.uid()` を使った RLS ポリシーがそのまま適用される。
 * → 認可は「RLS + Action 内の role 確認」の二重（CLAUDE.md）
 */
export async function withRls<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (userId) {
      const claims = JSON.stringify({ sub: userId, role: 'authenticated' })
      await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`)
      await tx.execute(sql`set local role authenticated`)
    } else {
      await tx.execute(sql`select set_config('request.jwt.claims', '{"role":"anon"}', true)`)
      await tx.execute(sql`set local role anon`)
    }
    try {
      return await fn(tx)
    } finally {
      await tx.execute(sql`reset role`)
    }
  })
}
