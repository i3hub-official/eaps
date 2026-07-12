// src/routes/api/assessment/session/[sessionId]/timer/+server.ts
// POST — server-authoritative timer sync (ping every 20s from client)

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { syncTimer } from '$lib/server/assessments/engine'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params
  const body = await request.json()

  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')

  const result = await syncTimer(sessionId, body.clientRemainingSeconds ?? 0)

  if (result?.expired) {
    return json({ expired: true, serverRemainingSeconds: 0 })
  }

  return json(result ?? { serverRemainingSeconds: 0 })
}