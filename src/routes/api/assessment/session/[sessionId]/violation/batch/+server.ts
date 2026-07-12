// src/routes/api/assessment/session/[sessionId]/violations/batch/+server.ts
// POST — log multiple violations in one round trip. This is the primary
// path ExamMonitor.svelte should use; the single-violation endpoint exists
// for callers that need an immediate write.

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'
import { submitSession } from '$lib/server/assessments/engine'
import { audit } from '$lib/server/audit'
import { serverCache } from '$lib/server/cache.js'
import type { ViolationType } from '@prisma/client'

const VIOLATION_SEVERITY: Record<ViolationType, number> = {
  FULLSCREEN_EXIT:    2,
  TAB_SWITCH:         2,
  COPY_ATTEMPT:       1,
  PASTE_ATTEMPT:      1,
  DEVTOOLS_OPEN:      3,
  FACE_NOT_DETECTED:  3,
  FACE_MISMATCH:      3,
  MULTIPLE_FACES:     3,
  IDLE_TIMEOUT:       1,
  NETWORK_DROP:       1,
  SCREEN_CAPTURE:     3,
  FOCUS_LOSS:         1,
  KEYBOARD_SHORTCUT:  1,
  CLOCK_TAMPER:       2,
}

const SESSION_OWNER_CACHE_TTL_MS = 30_000
const MAX_BATCH_SIZE = 50 // defensive cap — a client sending more than this per flush is anomalous

interface IncomingViolation {
  type: string
  severity?: number
  metadata?: unknown
}

async function getSessionOwnerInfo(sessionId: string) {
  const prisma = await getPrismaClient()
  const cacheKey = `session-owner:${sessionId}`

  const cached = await serverCache.get<{ studentId: string; status: string }>(cacheKey)
  if (cached) return cached

  const dbSession = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { studentId: true, status: true },
  })
  if (!dbSession) return null

  await serverCache.set(cacheKey, dbSession, SESSION_OWNER_CACHE_TTL_MS)
  return dbSession
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params
  const body = await request.json()

  const incoming = Array.isArray(body.violations) ? (body.violations as IncomingViolation[]) : []
  if (incoming.length === 0) {
    return json({ logged: 0 })
  }

  const capped = incoming.slice(0, MAX_BATCH_SIZE)

  const sessionInfo = await getSessionOwnerInfo(sessionId)
  if (!sessionInfo || sessionInfo.studentId !== student.id) throw error(403, 'Forbidden')
  if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(sessionInfo.status)) {
    return json({ logged: 0, reason: 'session closed' })
  }

  const prisma = await getPrismaClient()

  const rows = capped.map((v) => ({
    sessionId,
    type: v.type as ViolationType,
    severity: v.severity ?? VIOLATION_SEVERITY[v.type as ViolationType] ?? 1,
    metadata: (v.metadata ?? null) as any,
  }))

  await prisma.violation.createMany({ data: rows })

  // Check for auto-disqualification AFTER the batch write, based on total
  // accumulated critical violations for this session (not just this batch).
  const criticalInBatch = rows.some((r) => r.severity === 3)
  let autoSubmitted = false

  if (criticalInBatch) {
    const criticalCount = await prisma.violation.count({
      where: { sessionId, severity: 3 },
    })
    if (criticalCount >= 3) {
      try {
        const result = await submitSession(sessionId, 'AUTO_VIOLATION')
        await serverCache.del(`session-owner:${sessionId}`)
        await audit.system('SESSION_AUTO_DISQUALIFIED', 'AssessmentSession', {
          entityId: sessionId,
          afterData: { studentId: student.id, ...result },
        })
        autoSubmitted = true
      } catch {
        // Race: session already closed by another path — not an error
        // condition worth surfacing to the client.
      }
    }
  }

  return json({ logged: rows.length, autoSubmitted })
}