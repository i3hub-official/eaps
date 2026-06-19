// src/routes/api/exam/[examId]/result/+server.ts
//
// GET ?sessionId=<uuid>
// Returns the ExamResult for the student's session.
// Only accessible by the student who owns the session.

import { json, error }         from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { UUID_RE }             from '$lib/server/exam/session-engine.js';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const user      = await requireStudent(locals.user);
  const examId    = params.examId;
  const sessionId = url.searchParams.get('sessionId');

  if (!examId    || !UUID_RE.test(examId))    throw error(400, 'Invalid exam ID');
  if (!sessionId || !UUID_RE.test(sessionId)) throw error(400, 'Invalid session ID');

  const prisma = await getPrismaClient();

  // Validate ownership
  const session = await prisma.examSession.findUnique({
    where:  { id: sessionId },
    select: { studentId: true, examId: true, status: true },
  });

  if (!session)                      throw error(404, 'Session not found');
  if (session.studentId !== user.id) throw error(403, 'Forbidden');
  if (session.examId    !== examId)  throw error(403, 'Forbidden');

  if (
    session.status !== 'submitted' &&
    session.status !== 'force_submitted'
  ) {
    throw error(409, 'Exam has not been submitted yet');
  }

  // Check showResultAfter on the exam
  const exam = await prisma.exam.findUnique({
    where:  { id: examId },
    select: { showResultAfter: true },
  });

  if (!exam?.showResultAfter) {
    // Should not be called in this case, but guard anyway
    throw error(403, 'Results are not available for this exam yet');
  }

  const result = await prisma.examResult.findUnique({
    where:  { sessionId },
    select: {
      score:          true,
      percentage:     true,
      passed:         true,
      correct:        true,
      totalQuestions: true,
      answered:       true,
      grade:          true,
      violationCount: true,
      timeTakenSecs:  true,
    },
  });

  if (!result) throw error(404, 'Result not yet available — please check back shortly');

  return json({
    score:          result.score          != null ? Number(result.score)      : null,
    percentage:     result.percentage     != null ? Number(result.percentage) : null,
    passed:         result.passed,
    correct:        result.correct,
    totalQuestions: result.totalQuestions,
    answered:       result.answered,
    grade:          result.grade,
    violationCount: result.violationCount,
    timeTakenSecs:  result.timeTakenSecs,
  });
};