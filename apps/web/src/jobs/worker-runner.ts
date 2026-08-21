import { claimNextJob, executeJob, requeueStaleJobs } from './queue'
import { ensureJobHandlersRegistered } from './register'
import { registeredHandlerNames } from './handlers'

/**
 * 独立プロセスとして動かすWorker。`npm run worker`
 * 本番では Web と分離して常駐させる(要件92)。
 */
const WORKER_ID = `worker-${process.pid}`
const IDLE_DELAY_MS = 1500

async function main(): Promise<void> {
  ensureJobHandlersRegistered()
  console.log(`[worker] started ${WORKER_ID}, handlers=${registeredHandlerNames().length}`)

  let running = true
  const stop = () => {
    running = false
    console.log('[worker] shutting down…')
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  let sinceSweep = 0
  while (running) {
    const job = await claimNextJob(WORKER_ID)
    if (job) {
      await executeJob(job)
      continue
    }

    sinceSweep += IDLE_DELAY_MS
    if (sinceSweep > 60_000) {
      sinceSweep = 0
      const requeued = await requeueStaleJobs()
      if (requeued > 0) console.log(`[worker] requeued ${requeued} stale job(s)`)
    }
    await new Promise((resolve) => setTimeout(resolve, IDLE_DELAY_MS))
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('[worker] fatal', error)
  process.exit(1)
})
