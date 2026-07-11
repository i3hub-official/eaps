// src/routes/api/assessment/session/[sessionId]/answer/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { saveAnswer } from '$lib/server/assessment/engine'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const student = await requireStudent(locals.user)
  const { sessionId } = params
  const body = await request.json()

  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')

  const answer = await saveAnswer(sessionId, {
    questionId: body.questionId,
    selectedOptions: body.selectedOptions,
    textAnswer: body.textAnswer,
    orderAnswer: body.orderAnswer,
    matchAnswer: body.matchAnswer,
  })

  return json({ saved: true, answeredAt: answer.answeredAt })
}