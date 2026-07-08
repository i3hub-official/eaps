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
