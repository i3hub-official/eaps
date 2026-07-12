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

  // Same source-of-truth check used on the dashboard: a FaceDescriptor row
  // must actually exist, not just a non-null faceEnrolledAt timestamp
  // (which can go stale if the descriptor was later deleted, e.g. by an
  // admin removing a fraudulent duplicate enrollment). This is the real
  // gate — the dashboard's disabled "Start" button is UX only and can be
  // bypassed by calling this endpoint directly, so the check has to live
  // here too.
  const descriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: student.id },
    select: { id: true },
  })
  if (!descriptor) throw error(403, 'Face enrollment required before starting any assessment')

  const updated = await startSession(sessionId)

  return json({ status: updated.status, expiresAt: updated.expiresAt })
}