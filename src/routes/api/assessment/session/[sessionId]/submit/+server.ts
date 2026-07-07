// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/assessment/session/[sessionId]/submit/+server.ts
// POST — final submission

import { json as j5, error as e5 } from '@sveltejs/kit'
import type { RequestHandler as RH5 } from './$types'
import { requireStudent as rs5 } from '$lib/server/auth/guards'
import { submitSession } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js';
import { audit as a5 } from '$lib/server/audit'

export const _submit_POST: RH5 = async (event) => {
  const { student } = await rs5(event)
  const { sessionId } = event.params

  const prisma = await getPrismaClient();
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw e5(403, 'Forbidden')

  const result = await submitSession(sessionId, 'MANUAL')

  await a5.student(student.id, 'SESSION_SUBMITTED', 'AssessmentSession', {
    entityId: sessionId,
    afterData: result,
  })

  // Only expose score if showResultImmediately is on for this assessment.
  // submitSession() returns isReleased alongside the grade fields for
  // exactly this check.
  return j5({
    submitted: true,
    percentage: result.isReleased ? result.percentage : undefined,
    grade: result.isReleased ? result.grade : undefined,
    passed: result.isReleased ? result.passed : undefined,
  })
}