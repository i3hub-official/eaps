// src/routes/api/face/descriptor/+server.ts
// GET — returns decrypted face descriptor for client-side matching.
// Only served to the authenticated student who owns it, over HTTPS.

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { decryptDescriptor } from '$lib/server/face/crypto.js'

export const GET: RequestHandler = async (event) => {
  const { student } = await requireStudent(event)

  const prisma = await getPrismaClient()
  const record = await prisma.faceDescriptor.findUnique({
    where: { studentId: student.id },
  })

  if (!record) {
    throw error(404, 'Face not enrolled. Please enroll your face before taking an exam.')
  }

  const descriptor = await decryptDescriptor(record.encryptedData, record.iv)

  // Return as plain number array — similarity computed client-side
  return json({ descriptor })
}


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


// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/face/enroll/+server.ts
// POST — receives averaged + normalised descriptor, encrypts, stores.
// (Replaces the earlier /api/student/face-enroll route — path changed to
//  match the /api/face/* namespace used by the verify page)

import { json as j3, error as e3 } from '@sveltejs/kit'
import type { RequestHandler as RH3 } from './$types'
import { requireStudent as rs3 } from '$lib/server/auth/guards.js'
import { getPrismaClient as gpc3 } from '$lib/server/db/index.js'
import { encryptDescriptor, findDuplicateEnrollment } from '$lib/server/face/crypto.js'
import { audit as audit3 } from '$lib/server/audit.js'

export const POST: RH3 = async (event) => {
  const { student } = await rs3(event)
  const body = await event.request.json()
  const descriptor = body.descriptor as number[]

  if (!Array.isArray(descriptor) || descriptor.length < 128) {
    throw e3(400, 'Invalid face descriptor — must be a float array of at least 128 values.')
  }

  // Cross-student duplicate check
  const duplicate = await findDuplicateEnrollment(descriptor, student.id)
  if (duplicate) {
    throw e3(409, 'This face is already registered to another student account.')
  }

  const { encryptedData, iv } = await encryptDescriptor(descriptor)
  const prisma = await gpc3()

  await prisma.faceDescriptor.upsert({
    where: { studentId: student.id },
    create: {
      studentId:         student.id,
      encryptedData,
      iv,
      enrolledIpAddress: event.getClientAddress(),
    },
    update: {
      encryptedData,
      iv,
      enrolledAt: new Date(),
    },
  })

  await prisma.student.update({
    where: { id: student.id },
    data:  { faceEnrolledAt: new Date() },
  })

  await audit3.student(student.id, 'FACE_ENROLLED', 'FaceDescriptor', {
    ipAddress: event.getClientAddress(),
  })

  return j3({ enrolled: true })
}