// src/routes/api/assessment/session/[sessionId]/violation/+server.ts
// POST — log a violation from the kiosk

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'
import { submitSession } from '$lib/server/assessments/engine'
import { audit } from '$lib/server/audit'
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

// Per-type cooldown (seconds) — prevents spam logging
const COOLDOWN: Partial<Record<ViolationType, number>> = {
  FOCUS_LOSS:         5,
  NETWORK_DROP:       10,
  FACE_NOT_DETECTED:  8,
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params
  const body = await request.json()
  const type = body.type as ViolationType

  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')
  if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
    return json({ logged: false, reason: 'session closed' })
  }

  const cooldownSec = COOLDOWN[type]
  if (cooldownSec) {
    const recent = await prisma.violation.findFirst({
      where: {
        sessionId,
        type,
        createdAt: { gte: new Date(Date.now() - cooldownSec * 1000) },
      },
    })
    if (recent) return json({ logged: false, reason: 'cooldown' })
  }

  const violation = await prisma.violation.create({
    data: {
      sessionId,
      type,
      severity: VIOLATION_SEVERITY[type] ?? 1,
      metadata: body.metadata ?? null,
    },
  })

  if (VIOLATION_SEVERITY[type] === 3) {
    const criticalCount = await prisma.violation.count({
      where: { sessionId, severity: 3 },
    })
    if (criticalCount >= 3) {
      try {
        const result = await submitSession(sessionId, 'AUTO_VIOLATION')

        await audit.system('SESSION_AUTO_DISQUALIFIED', 'AssessmentSession', {
          entityId: sessionId,
          afterData: { studentId: student.id, violationId: violation.id, ...result },
        })

        return json({ logged: true, id: violation.id, autoSubmitted: true })
      } catch {
        return json({ logged: true, id: violation.id, autoSubmitted: false, note: 'session already closed' })
      }
    }
  }

  return json({ logged: true, id: violation.id })
}