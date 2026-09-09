import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type Db = ReturnType<typeof createDb>

declare global {
  var __studioNDb: Db | undefined
}

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL が設定されていません。')
  const client = postgres(url, { prepare: false, max: 5 })
  return drizzle(client, { schema })
}

function getDb(): Db {
  if (!globalThis.__studioNDb) globalThis.__studioNDb = createDb()
  return globalThis.__studioNDb
}

/**
 * Drizzle クライアント（サーバー専用・遅延初期化）。
 * RLS はバイパスされるため、呼び出し側（Server Actions / queries）で必ず認可を行う。
 * RLS を効かせたい書き込みは `lib/db/rls.ts` の `withRls` を使う。
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb()
    const value = Reflect.get(real, prop, receiver)
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export { schema }
