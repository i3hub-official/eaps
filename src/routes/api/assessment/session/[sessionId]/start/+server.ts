// src/routes/api/assessment/session/[sessionId]/start/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { startSession } from '$lib/server/assessments/engine'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params

  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')

  const updated = await startSession(sessionId)

  return json({ status: updated.status, expiresAt: updated.expiresAt })
}