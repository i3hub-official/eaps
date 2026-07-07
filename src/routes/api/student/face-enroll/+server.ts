// src/routes/api/student/face-enroll/+server.ts
// POST — receives averaged face descriptor from client, encrypts, stores

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { encryptDescriptor, findDuplicateEnrollment } from '$lib/server/face/crypto'
import { audit } from '$lib/server/audit'

export const POST: RequestHandler = async (event) => {
  const { student } = await requireStudent(event)
  const body = await event.request.json()

  const descriptor = body.descriptor as number[]

  if (!Array.isArray(descriptor) || descriptor.length < 128) {
    throw error(400, 'Invalid face descriptor')
  }

  // Cross-student duplicate check — prevent one person enrolling
  // under multiple student accounts (threshold 0.72)
  const duplicate = await findDuplicateEnrollment(descriptor, student.id)
  if (duplicate) {
    throw error(409, {
      message: 'This face is already registered to another student account.',
      code: 'FACE_ALREADY_REGISTERED',
    })
  }

  // Encrypt descriptor before storage
  const { encryptedData, iv } = await encryptDescriptor(descriptor)

  await db.faceDescriptor.upsert({
    where: { studentId: student.id },
    create: {
      studentId: student.id,
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

  // Update student faceEnrolledAt
  await db.student.update({
    where: { id: student.id },
    data: { faceEnrolledAt: new Date() },
  })

  await audit.student(student.id, 'FACE_ENROLLED', 'FaceDescriptor', {
    ipAddress: event.getClientAddress(),
  })

  return json({ enrolled: true })
}


// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/student/face-descriptor/+server.ts
// GET — returns decrypted descriptor for client-side verification
// Only sent over HTTPS to the authenticated student themselves

import { json as j2, error as e2 } from '@sveltejs/kit'
import type { RequestHandler as RH2 } from './$types'
import { requireStudent as rs2 } from '$lib/server/auth/guards'
import { db as db2 } from '$lib/server/db'
import { decryptDescriptor } from '$lib/server/face/crypto'

export const GET: RH2 = async (event) => {
  const { student } = await rs2(event)

  const record = await db2.faceDescriptor.findUnique({
    where: { studentId: student.id },
  })

  if (!record) throw e2(404, 'Face not enrolled')

  const descriptor = await decryptDescriptor(record.encryptedData, record.iv)

  // Return as float array — client computes similarity locally
  return j2({ descriptor })
}


// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/assessment/session/[sessionId]/face-verify/+server.ts
// POST — records face verification result on the session

import { json as j3, error as e3 } from '@sveltejs/kit'
import type { RequestHandler as RH3 } from './$types'
import { requireStudent as rs3 } from '$lib/server/auth/guards'
import { db as db3 } from '$lib/server/db'

export const POST: RH3 = async (event) => {
  const { student } = await rs3(event)
  const { sessionId } = event.params
  const body = await event.request.json()

  const session = await db3.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw e3(403, 'Forbidden')

  await db3.assessmentSession.update({
    where: { id: sessionId },
    data: {
      faceVerifiedAt: new Date(),
      faceScore: body.score ?? null,
    },
  })

  return j3({ verified: true })
}