// src/routes/student/exams/[examId]/complete/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireStudent(locals.user);
  const examId = params.examId;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      course: { select: { code: true, title: true } },
      durationMinutes: true,
      totalMarks: true,
      passMark: true,
    },
  });

  if (!exam) throw error(404, 'Exam not found');

  // Require existing session — do NOT create one on the completion page
  const session = await prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId: user.id } },
  });

  if (!session) {
    throw error(404, 'No exam session found');
  }

  if (session.status !== 'submitted' && session.status !== 'force_submitted') {
    throw error(403, 'Exam not yet submitted');
  }

  // Load the result if available
  const result = await prisma.examResult.findUnique({
    where: { sessionId: session.id },
  });

  return {
    exam,
    session: {
      id: session.id,
      status: session.status,
      submittedAt: session.submittedAt,
      score: session.score,
      isGraded: session.isGraded,
      violationCount: session.violationCount,
    },
    result: result ? {
      score: result.score,
      percentage: result.percentage,
      passed: result.passed,
      grade: result.grade,
      correct: result.correct,
      answered: result.answered,
      totalQuestions: result.totalQuestions,
      timeTakenSecs: result.timeTakenSecs,
    } : null,
  };
};