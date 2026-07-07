// src/routes/api/assessment/session/+server.ts
// POST /api/assessment/session — create a new session

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import {
  checkStudentEligibility,
  createSession,
} from '$lib/server/assessment/engine'
import { audit } from '$lib/server/audit'

export const POST: RequestHandler = async (event) => {
  const { student } = await requireStudent(event)
  const body = await event.request.json()
  const { assessmentId } = body

  if (!assessmentId) throw error(400, 'assessmentId required')

  const eligibility = await checkStudentEligibility(assessmentId, student.id)

  if (!eligibility.eligible) {
    throw error(403, eligibility.reason ?? 'Not eligible')
  }

  // If there's an active session, return it
  if ((eligibility as any).resumeSessionId) {
    return json({ sessionId: (eligibility as any).resumeSessionId, resumed: true })
  }

  const session = await createSession(assessmentId, student.id, {
    ipAddress: event.getClientAddress(),
    userAgent: event.request.headers.get('user-agent') ?? undefined,
    deviceFingerprint: event.request.headers.get('x-device-fingerprint') ?? undefined,
  })

  await audit.student(student.id, 'SESSION_CREATED', 'AssessmentSession', {
    entityId: session.id,
  })

  return json({ sessionId: session.id, resumed: false }, { status: 201 })
}

