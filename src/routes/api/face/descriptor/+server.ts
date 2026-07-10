// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { decryptDescriptor } from '$lib/server/face/crypto.js'
import { serverCache } from '$lib/server/cache.js'

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache duration

export const GET: RequestHandler = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const cacheKey = `face_descriptor:${student.id}`;

  // 1. Check server-side memory cache first
  const cachedDescriptor = serverCache.get<number[]>(cacheKey);
  if (cachedDescriptor) {
    return json({ descriptor: cachedDescriptor });
  }

  const prisma = await getPrismaClient()
  const record = await prisma.faceDescriptor.findUnique({
    where: { studentId: student.id },
  })

  if (!record) {
    throw error(404, 'Face not enrolled. Please enroll your face before taking an exam.')
  }

  // 2. Perform the heavy decryption work only once
  const descriptor = await decryptDescriptor(record.encryptedData, record.iv)

  // 3. Store the result in memory cache for subsequent verification requests
  serverCache.set(cacheKey, descriptor, CACHE_TTL);

  return json({ descriptor })
}