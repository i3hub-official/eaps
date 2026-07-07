
// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/assessment/session/[sessionId]/start/+server.ts
// POST — transition session from PENDING to IN_PROGRESS (after face verify)

import { json as j2, error as e2 } from '@sveltejs/kit'
import type { RequestHandler as RH2 } from './$types'
import { requireStudent as rs2 } from '$lib/server/auth/guards'
import { startSession } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js';

export const _start_POST: RH2 = async (event) => {
  const { student } = await rs2(event)
  const { sessionId } = event.params

  const prisma = await getPrismaClient();
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw e2(403, 'Forbidden')

  const updated = await startSession(sessionId)

  return j2({ status: updated.status, expiresAt: updated.expiresAt })
}

