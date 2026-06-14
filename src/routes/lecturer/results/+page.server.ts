// src/routes/lecturer/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  const user    = requireLecturer(locals.user);
  const examId  = url.searchParams.get('examId') ?? undefined;
  const session = url.searchParams.get('session') ?? undefined;

  // All exams by this lecturer for the filter dropdown
  const myExams = await prisma.exam.findMany({
    where:   { createdBy: user.id },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, title: true, status: true, course: { select: { code: true } } },
  });

  const results = await prisma.examResult.findMany({
    where: {
      exam: {
        createdBy: user.id,
        ...(examId  ? { id: examId }      : {}),
        ...(session ? { session }          : {}),
      },
    },
    orderBy: { generatedAt: 'desc' },
    select: {
      id: true, score: true, percentage: true, passed: true,
      grade: true, correct: true, answered: true, totalQuestions: true,
      violationCount: true, timeTakenSecs: true, submittedAt: true,
      exam: {
        select: {
          id: true, title: true, totalMarks: true, passMark: true, session: true,
          course: { select: { code: true } },
        },
      },
      student: {
        select: {
          id: true, fullName: true, matricNumber: true,
          department: { select: { code: true } },
        },
      },
    },
  });

  const aggregate = await prisma.examResult.aggregate({
    where: { exam: { createdBy: user.id, ...(examId ? { id: examId } : {}) } },
    _avg:   { percentage: true },
    _max:   { percentage: true },
    _min:   { percentage: true },
    _count: { id: true },
  });

  const passed = results.filter(r => r.passed).length;

  return {
    results,
    myExams,
    summary: {
      total:   aggregate._count.id,
      passed,
      failed:  results.length - passed,
      avgPct:  Math.round(Number(aggregate._avg.percentage ?? 0)),
      bestPct: Math.round(Number(aggregate._max.percentage ?? 0)),
      passRate: results.length ? Math.round((passed / results.length) * 100) : 0,
    },
    selectedExamId: examId ?? 'all',
  };
};