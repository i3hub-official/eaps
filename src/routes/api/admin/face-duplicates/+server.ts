// src/routes/api/admin/face-duplicates/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireAdmin } from '$lib/server/auth/guards.js'
import { findAllDuplicateEnrollments } from '$lib/server/face/crypto.js'

export const GET: RequestHandler = async ({ locals }) => {
  await requireAdmin(locals.user)

  const startedAt = Date.now()
  const pairs = await findAllDuplicateEnrollments()
  const durationMs = Date.now() - startedAt

  return json({ pairs, count: pairs.length, durationMs })
}