// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/face/verify-session/+server.ts
// POST — records the face verification result on the active assessment session.
// Called by the verify page after a successful client-side match.

import { json as j2, error as e2 } from '@sveltejs/kit'
import type { RequestHandler as RH2 } from './$types'
import { requireStudent as rs2 } from '$lib/server/auth/guards.js'
import { getPrismaClient as gpc2 } from '$lib/server/db/index.js'
import { audit } from '$lib/server/audit.js'

export const POST: RH2 = async (event) => {
  const { student } = await rs2(event)
  const body = await event.request.json()

  const {
    verified,
    similarityScore,
    antispoofScore,
    livenessScore,
    examId,
  } = body as {
    verified:        boolean
    similarityScore: number
    antispoofScore:  number
    livenessScore:   number
    examId:          string | null
  }

  if (!verified) {
    return j2({ recorded: false })
  }

  const prisma = await gpc2()

  // Find the active session for this student + exam
  const session = examId
    ? await prisma.assessmentSession.findFirst({
        where: {
          assessmentId: examId,
          studentId:    student.id,
          status:       { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    : null

  if (session) {
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: {
        faceVerifiedAt: new Date(),
        faceScore:      similarityScore / 100, // store as 0–1
      },
    })
  }

  await audit.student(student.id, 'FACE_VERIFIED', 'FaceDescriptor', {
    entityId:  student.id,
    afterData: { similarityScore, antispoofScore, livenessScore, examId },
    ipAddress: event.getClientAddress(),
  })

  return j2({ recorded: true, sessionId: session?.id ?? null })
}
