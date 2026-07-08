// src/routes/api/student/face-enroll/+server.ts
// POST — receives averaged face descriptor from client, encrypts, stores

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js';
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

  const prisma = await getPrismaClient()
  await prisma.faceDescriptor.upsert({
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
  await prisma.student.update({
    where: { id: student.id },
    data: { faceEnrolledAt: new Date() },
  })

  await audit.student(student.id, 'FACE_ENROLLED', 'FaceDescriptor', {
    ipAddress: event.getClientAddress(),
  })

  return json({ enrolled: true })
}
