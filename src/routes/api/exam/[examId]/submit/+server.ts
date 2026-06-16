// src/routes/api/exam/[examId]/submit/+server.ts

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getSessionByExamAndStudent } from '$lib/server/db/sessions.js';
import { finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';

// Body is optional for student self-submit — no required fields
const SubmitSchema = z.object({
  force: z.boolean().default(false),
}).optional();

export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not authenticated');
  if (user.role !== 'student') throw error(403, 'Only students can submit exams');

  const { examId } = event.params;
  if (!UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const rawBody = await event.request.json().catch(() => ({}));
  const parsed  = SubmitSchema.safeParse(rawBody);

  if (!parsed.success) {
    throw error(400, 'Invalid request body');
  }

  const session = await getSessionByExamAndStudent(examId, user.id);
  if (!session) throw error(404, 'Exam session not found.');

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    const { result } = await finalizeSession(session.id, session.status);
    return json({ ok: true, result: toResultPayload(result) });
  }

  if (session.status !== 'in_progress') {
    throw error(409, `Cannot submit — session status is "${session.status}".`);
  }

  const { result } = await finalizeSession(session.id, 'submitted');
  return json({ ok: true, result: toResultPayload(result) });
};

function toResultPayload(result: {
  totalQuestions: number | null;
  answered:       number | null;
  correct:        number | null;
  score:          unknown;
  percentage:     unknown;
  passed:         boolean | null;
  grade:          string | null;
  timeTakenSecs:  number | null;
}) {
  return {
    total_questions: result.totalQuestions,
    answered:        result.answered,
    correct:         result.correct,
    score:           result.score      == null ? null : Number(result.score),
    percentage:      result.percentage == null ? null : Number(result.percentage),
    passed:          result.passed,
    grade:           result.grade,
    time_taken_secs: result.timeTakenSecs,
  };
}