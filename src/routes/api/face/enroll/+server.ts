// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { encryptDescriptor, findDuplicateEnrollment } from '$lib/server/face/crypto.js'
import { audit } from '$lib/server/audit.js'

// Sanity floor, not an exact match — actual embedding length depends on the
// client's Human model config (description model), so we validate shape
// rather than a fixed dimension.
const MIN_DESCRIPTOR_LENGTH = 64

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  const student = await requireStudent(locals.user)

  const body = await request.json()
  const descriptor = body.descriptor as number[]

  const isValid =
    Array.isArray(descriptor) &&
    descriptor.length >= MIN_DESCRIPTOR_LENGTH &&
    descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))

  if (!isValid) {
    throw error(400, 'Invalid face descriptor.')
  }

  // Cross-student duplicate check — prevent one person enrolling under
  // multiple student accounts.
  const duplicate = await findDuplicateEnrollment(descriptor, student.id)
  if (duplicate) {
    throw error(409, 'This face is already registered to another student account.')
  }

  const { encryptedData, iv } = await encryptDescriptor(descriptor)
  const prisma = await getPrismaClient()
  const ip = getClientAddress()

  await prisma.faceDescriptor.upsert({
    where: { studentId: student.id },
    create: { studentId: student.id, encryptedData, iv, enrolledIpAddress: ip },
    update: { encryptedData, iv, enrolledAt: new Date(), enrolledIpAddress: ip },
  })

  await prisma.student.update({
    where: { id: student.id },
    data: { faceEnrolledAt: new Date() },
  })

  await audit.student(student.id, 'FACE_ENROLLED', 'FaceDescriptor', { ipAddress: ip })

  return json({ enrolled: true })
}