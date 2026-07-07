
// ─────────────────────────────────────────────────────────────────────────────
// src/routes/api/assessment/session/[sessionId]/answer/+server.ts
// POST — save/update a single answer (called on every option select)

import { json as j3, error as e3 } from '@sveltejs/kit'
import type { RequestHandler as RH3 } from './$types'
import { requireStudent as rs3 } from '$lib/server/auth/guards'
import { saveAnswer } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js';

export const _answer_POST: RH3 = async (event) => {
  const { student } = await rs3(event)
  const { sessionId } = event.params
  const body = await event.request.json()

  const prisma = await getPrismaClient();
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw e3(403, 'Forbidden')

  const answer = await saveAnswer(sessionId, {
    questionId: body.questionId,
    selectedOptions: body.selectedOptions,
    textAnswer: body.textAnswer,
    orderAnswer: body.orderAnswer,
    matchAnswer: body.matchAnswer,
  })

  return j3({ saved: true, answeredAt: answer.answeredAt })
}

