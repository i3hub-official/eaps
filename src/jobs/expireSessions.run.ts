// ─────────────────────────────────────────────────────────────────────────────
// src/jobs/expireSessions.run.ts
// Thin entrypoint — wire this into whatever actually triggers jobs in your
// deployment (node-cron interval, BullMQ repeatable job, platform cron
// hitting a protected +server.ts route, etc). Not wired to anything yet.

import { expireSessions } from './expireSessions'

expireSessions()
  .then(result => {
    console.log(`[expireSessions] scanned=${result.scanned} submitted=${result.submitted} failed=${result.failed.length}`)
    if (result.failed.length) console.error('[expireSessions] failures:', result.failed)
    process.exit(result.failed.length > 0 ? 1 : 0)
  })
  .catch(err => {
    console.error('[expireSessions] fatal error', err)
    process.exit(1)
  })