
// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/assessment/session/[sessionId]/timer/+server.ts
// POST — server-authoritative timer sync (ping every 30s from client)

import { json as j4, error as e4 } from '@sveltejs/kit'
import type { RequestHandler as RH4 } from './$types'
import { requireStudent as rs4 } from '$lib/server/auth/guards'
import { syncTimer } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js';


export const _timer_POST: RH4 = async (event) => {
  const { student } = await rs4(event)
  const { sessionId } = event.params
  const body = await event.request.json()

  const prisma = await getPrismaClient();
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw e4(403, 'Forbidden')

  const result = await syncTimer(sessionId, body.clientRemainingSeconds ?? 0)

  if (result?.expired) {
    return j4({ expired: true, serverRemainingSeconds: 0 })
  }

  return j4(result ?? { serverRemainingSeconds: 0 })
}

