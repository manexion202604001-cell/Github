import type { JobHandler } from './types'

/**
 * Job ハンドラの登録表。
 * feature 側が自分のハンドラを登録し、worker はこの表だけを見る。
 * 直接 import しないことで、feature → jobs の一方向依存を保つ。
 */
const handlers = new Map<string, JobHandler>()

export function registerJobHandler(name: string, handler: JobHandler): void {
  handlers.set(name, handler)
}

export function getJobHandler(name: string): JobHandler | undefined {
  return handlers.get(name)
}

export function registeredHandlerNames(): string[] {
  return [...handlers.keys()]
}
