// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { decryptDescriptor } from '$lib/server/face/crypto.js'
import { serverCache } from '$lib/server/cache.js'
import { faceDescriptorCacheKey } from '$lib/server/face/cache-key.js'

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache duration

// GET — returns the current student's own enrolled face descriptor,
// decrypted, as a plain number[]. Consumed by FaceVerifyModal to run
// cosineSimilarity() client-side against a fresh capture.
//
// IMPORTANT: only ever returns the descriptor belonging to locals.user —
// there is no studentId param here on purpose. Never accept a studentId
// from the query string / body for this route.
export const GET: RequestHandler = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const cacheKey = faceDescriptorCacheKey(student.id);

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

  // 2. Perform the decryption
  const descriptor = await decryptDescriptor(record.encryptedData, record.iv)

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    throw error(500, 'Stored face profile is corrupt.');
  }

  // 3. Cache the result. NOTE: this is invalidated in enroll/+server.ts on
  // every re-enrollment via the same faceDescriptorCacheKey(). If you ever
  // add another way for a descriptor to change (admin reset, account
  // merge, GDPR-style delete-and-redo, etc.), invalidate this same key
  // there too, or drop the cache entirely — decrypting a ~128+ float
  // embedding per request is cheap enough that the correctness risk of a
  // forgotten invalidation site may not be worth the win.
  serverCache.set(cacheKey, descriptor, CACHE_TTL);

  return json({ descriptor })
}