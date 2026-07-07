// ─────────────────────────────────────────────────────────────────────────────
// src/jobs/expireSessions.ts
// Sweeps sessions that have run past expiresAt but are still IN_PROGRESS —
// covers students who close the tab / lose power instead of submitting or
// hitting the lazy expiry check in saveAnswer/syncTimer.

import { getPrismaClient } from '$lib/server/db/index.js'
import { submitSession } from '$lib/server/assessment/engine'
import { audit } from '$lib/server/audit'

export interface ExpireSessionsResult {
  scanned: number
  submitted: number
  failed: Array<{ sessionId: string; error: string }>
}

export async function expireSessions(): Promise<ExpireSessionsResult> {
  const prisma = await getPrismaClient()

  const expired = await prisma.assessmentSession.findMany({
    where: {
      status: 'IN_PROGRESS',
      expiresAt: { lt: new Date() },
    },
    select: { id: true, studentId: true },
  })

  const failed: ExpireSessionsResult['failed'] = []
  let submitted = 0

  // Sequential, not Promise.all — each submitSession does its own
  // transaction and grading pass; running them concurrently against the
  // same DB connection pool under a sweep of many sessions is asking for
  // contention/deadlocks for no real benefit (this job isn't latency-sensitive).
  for (const s of expired) {
    try {
      const result = await submitSession(s.id, 'AUTO_TIME')

      // ASSUMPTION: audit.system(...) exists — see note in violation/+server.ts.
      await audit.system('SESSION_AUTO_TIMEOUT', 'AssessmentSession', {
        entityId: s.id,
        afterData: { studentId: s.studentId, ...result },
      })

      submitted++
    } catch (err) {
      // Most likely: already closed by a manual submit or violation
      // auto-submit that raced this sweep. Not fatal — log and continue.
      failed.push({ sessionId: s.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { scanned: expired.length, submitted, failed }
}