// src/routes/api/exam/[examId]/answer/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getSessionByExamAndStudent, saveAnswerFlat, updateTimeRemaining } from '$lib/server/db/sessions.js';
import { getExamById } from '$lib/server/db/exams.js';
import { computeDeadline, secondsRemaining, finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';


const UUIDSchema = z.string().regex(UUID_RE, 'Must be a valid UUID');

const AnswerSchema = z.object({
  questionId:     UUIDSchema,
  selectedOption: UUIDSchema.nullable().optional(),
  textAnswer:     z.string().max(10_000).nullable().optional(),
  timeSpentSecs:  z.number().int().min(0).max(86_400).default(0),
});

export const POST: RequestHandler = async (event) => {
 const user = await requireStudent(event.locals.user);
  const { examId } = event.params;
  if (!UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const body   = await event.request.json().catch(() => null);
  const parsed = AnswerSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.flatten().fieldErrors as unknown as string);
  }

  const { questionId, selectedOption, textAnswer, timeSpentSecs } = parsed.data;

  const session = await getSessionByExamAndStudent(examId, user.id);
  if (!session) throw error(404, 'Exam session not found. Start the exam first.');

  if (session.status !== 'in_progress') {
    throw error(409, `Cannot save answers — session status is "${session.status}".`);
  }

  const exam = await getExamById(examId);
  if (!exam) throw error(404, 'Exam not found');

  if (!session.startedAt) throw error(500, 'Session has no start time');
  const deadline  = computeDeadline(exam, session.startedAt);
  const remaining = secondsRemaining(deadline);

  if (remaining <= 0) {
    await finalizeSession(session.id, 'force_submitted');
    throw error(410, 'Time is up. This exam has been submitted automatically.');
  }

  const prisma = await getPrismaClient();

  const locked = await prisma.sessionQuestionOrder.findUnique({
    where: { sessionId_questionId: { sessionId: session.id, questionId } },
  });
  if (!locked) throw error(403, 'This question is not part of your exam.');

  if (selectedOption) {
    const option = await prisma.questionOption.findUnique({ where: { id: selectedOption } });
    if (!option || option.questionId !== questionId) {
      throw error(400, 'Invalid option for this question.');
    }
  }

  const answer = await saveAnswerFlat(
    session.id,
    questionId,
    selectedOption ?? null,
    textAnswer    ?? null,
    timeSpentSecs,
  );

  await updateTimeRemaining(session.id, remaining);

  return json({
    ok:    true,
    saved: {
      questionId:     answer.questionId,
      selectedOption: answer.selectedOption,
      textAnswer:     answer.textAnswer,
    },
    time_remaining_secs: remaining,
  });
};