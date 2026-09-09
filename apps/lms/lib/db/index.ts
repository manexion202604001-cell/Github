import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var __studioNDb: ReturnType<typeof createDb> | undefined
}

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL が設定されていません。')
  const client = postgres(url, { prepare: false, max: 5 })
  return drizzle(client, { schema })
}

/**
 * Drizzle クライアント（サーバー専用）。
 * RLS はバイパスされるため、呼び出し側（Server Actions / queries）で必ず認可を行う。
 */
export const db: ReturnType<typeof createDb> = globalThis.__studioNDb ?? createDb()
if (process.env.NODE_ENV !== 'production') globalThis.__studioNDb = db

export { schema }
