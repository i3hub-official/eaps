// src/routes/student/face-enroll/+page.server.ts
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'
import { encryptDescriptor, findDuplicateEnrollment } from '$lib/server/face/crypto'

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const existing = await prisma.faceDescriptor.findUnique({
    where: { studentId: student.id },
    select: { enrolledAt: true, updatedAt: true },
  })

  return {
    alreadyEnrolled: Boolean(existing),
    enrolledAt: existing?.enrolledAt ?? null,
  }
}

export const actions: Actions = {
  enroll: async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user)

    const form = await request.formData()
    const descriptorRaw = form.get('descriptor')?.toString()

    if (!descriptorRaw) {
      return fail(400, { enrollError: 'No face was captured. Please try again.' })
    }

    let descriptor: number[]
    try {
      descriptor = JSON.parse(descriptorRaw)
      if (
        !Array.isArray(descriptor) ||
        descriptor.length === 0 ||
        !descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))
      ) {
        throw new Error('invalid shape')
      }
    } catch {
      return fail(400, { enrollError: 'The captured face data was invalid. Please try again.' })
    }

    const prisma = await getPrismaClient()

    // Prevent one face being registered against multiple student accounts —
    // an identity-fraud vector (enrolling on someone else's behalf, or one
    // person holding two accounts) that's worth catching before we write
    // anything permanent.
    const duplicateStudentId = await findDuplicateEnrollment(descriptor, student.id)
    if (duplicateStudentId) {
      return fail(409, {
        enrollError:
          'This face appears to already be enrolled under a different student account. Contact your exam officer if you believe this is a mistake.',
      })
    }

    const { encryptedData, iv } = await encryptDescriptor(descriptor)

    await prisma.$transaction([
      prisma.faceDescriptor.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          encryptedData,
          iv,
          enrolledIpAddress: getClientAddress(),
        },
        update: {
          encryptedData,
          iv,
          enrolledIpAddress: getClientAddress(),
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { faceEnrolledAt: new Date() },
      }),
    ])

    return { enrollSuccess: true }
  },
}