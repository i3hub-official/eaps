// src/routes/api/face/verify-session/+server.ts
// POST — records the face verification result on the active assessment session.

import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { audit } from '$lib/server/audit.js'

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  const student = await requireStudent(locals.user)
  const body = await request.json()

  const {
    verified,
    similarityScore,
    antispoofScore,
    livenessScore,
    examId,
  } = body as {
    verified: boolean
    similarityScore: number
    antispoofScore?: number
    livenessScore?: number
    examId: string | null
  }

  if (!verified) {
    return json({ recorded: false })
  }

  const prisma = await getPrismaClient()

  const session = examId
    ? await prisma.assessmentSession.findFirst({
        where: {
          assessmentId: examId,
          studentId: student.id,
          status: { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    : null

  if (session) {
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: {
        faceVerifiedAt: new Date(),
        faceScore: similarityScore / 100,
      },
    })
  }

  await audit.student(student.id, 'FACE_VERIFIED', 'FaceDescriptor', {
    entityId: student.id,
    afterData: { similarityScore, antispoofScore, livenessScore, examId },
    ipAddress: getClientAddress(),
  })

  return json({ recorded: true, sessionId: session?.id ?? null })
}