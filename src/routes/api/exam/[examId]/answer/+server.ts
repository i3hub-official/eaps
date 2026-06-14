// src/routes/api/exam/[examId]/answer/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getSessionByExamAndStudent, saveAnswerFlat, updateTimeRemaining } from '$lib/server/db/sessions.js';
import { getExamById } from '$lib/server/db/exams.js';
import { computeDeadline, secondsRemaining, finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';

export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not authenticated');
  if (user.role !== 'student') throw error(403, 'Only students can submit answers');

  const { examId } = event.params;
  if (!UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const body = await event.request.json().catch(() => null);
  if (!body || typeof body.questionId !== 'string' || !UUID_RE.test(body.questionId)) {
    throw error(400, 'questionId is required');
  }

  const { questionId } = body;
  const selectedOption: string | null =
    typeof body.selectedOption === 'string' && UUID_RE.test(body.selectedOption) ? body.selectedOption : null;
  const textAnswer: string | null = typeof body.textAnswer === 'string' ? body.textAnswer : null;
  const timeSpentSecs: number = Number.isFinite(body.timeSpentSecs)
    ? Math.max(0, Math.floor(body.timeSpentSecs))
    : 0;

  const session = await getSessionByExamAndStudent(examId, user.id);
  if (!session) throw error(404, 'Exam session not found. Start the exam first.');

  if (session.status !== 'in_progress') {
    throw error(409, `Cannot save answers — session status is "${session.status}".`);
  }

  const exam = await getExamById(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Time check: refuse (and finalize) if the deadline has passed ────────
  if (!session.startedAt) throw error(500, 'Session has no start time');
  const deadline = computeDeadline(exam, session.startedAt);
  const remaining = secondsRemaining(deadline);

  if (remaining <= 0) {
    await finalizeSession(session.id, 'force_submitted');
    throw error(410, 'Time is up. This exam has been submitted automatically.');
  }

  // ── Verify the question belongs to this student's locked question set ──
  const prisma = await getPrismaClient();
  const locked = await prisma.sessionQuestionOrder.findUnique({
    where: { sessionId_questionId: { sessionId: session.id, questionId } },
  });
  if (!locked) throw error(403, 'This question is not part of your exam.');

  // ── Verify selectedOption (if provided) actually belongs to the question ─
  if (selectedOption) {
    const option = await prisma.questionOption.findUnique({ where: { id: selectedOption } });
    if (!option || option.questionId !== questionId) {
      throw error(400, 'Invalid option for this question.');
    }
  }

  const answer = await saveAnswerFlat(session.id, questionId, selectedOption, textAnswer, timeSpentSecs);
  await updateTimeRemaining(session.id, remaining);

  return json({
    ok: true,
    saved: {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      textAnswer: answer.textAnswer,
    },
    time_remaining_secs: remaining,
  });
};