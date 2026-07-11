// src/routes/api/assessment/session/[sessionId]/submit/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { submitSession } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js'
import { audit } from '$lib/server/audit'

export const POST: RequestHandler = async ({ locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params

  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')

  const result = await submitSession(sessionId, 'MANUAL')

  await audit.student(student.id, 'SESSION_SUBMITTED', 'AssessmentSession', {
    entityId: sessionId,
    afterData: result,
  })

  return json({
    submitted: true,
    percentage: result.isReleased ? result.percentage : undefined,
    grade: result.isReleased ? result.grade : undefined,
    passed: result.isReleased ? result.passed : undefined,
  })
}