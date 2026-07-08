

// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/face/enroll/+server.ts
// POST — receives averaged + normalised descriptor, encrypts, stores.

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