// src/routes/api/face/violation/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

const VALID_TYPES = ['FACE_NOT_DETECTED', 'FACE_MISMATCH', 'MULTIPLE_FACES'] as const

export const POST: RequestHandler = async ({ request, locals }) => {
  const student = await requireStudent(locals.user)
  const body = await request.json()

  const { sessionId, type, severity, metadata } = body as {
    sessionId: string
    type: string
    severity?: number
    metadata?: Record<string, unknown>
  }

  if (!sessionId || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    throw error(400, 'Invalid violation payload.')
  }

  const prisma = await getPrismaClient()

  // Confirm the session actually belongs to this student before logging
  // anything against it.
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, studentId: student.id },
    select: { id: true },
  })
  if (!session) {
    throw error(404, 'Session not found.')
  }

  const violation = await prisma.violation.create({
    data: {
      sessionId,
      type: type as any,
      severity: severity ?? 1,
      metadata: metadata as any,
    },
  })

  return json({ logged: true, violationId: violation.id })
}