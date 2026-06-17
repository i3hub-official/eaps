// src/routes/student/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
            const prisma = await getPrismaClient();


  const [results, aggregate] = await Promise.all([
    prisma.examResult.findMany({
      where: { studentId: user.id },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, score: true, percentage: true, passed: true,
        grade: true, correct: true, answered: true, totalQuestions: true,
        violationCount: true, timeTakenSecs: true, submittedAt: true, generatedAt: true,
        exam: {
          select: {
            id: true, title: true, totalMarks: true, passMark: true,
            durationMinutes: true, session: true, semester: true,
            course: { select: { code: true, title: true } },
          },
        },
        session: {
          select: { startedAt: true, submittedAt: true, violationCount: true },
        },
      },
    }),

    prisma.examResult.aggregate({
      where: { studentId: user.id },
      _avg:   { percentage: true },
      _max:   { percentage: true },
      _min:   { percentage: true },
      _count: { id: true },
    }),
  ]);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed && r.passed !== null).length;

 return {
    results: results.map(r => ({
      ...r,
      score:      r.score      ? Number(r.score)      : null,
      percentage: r.percentage ? Number(r.percentage) : null,
      exam: r.exam ? {
        ...r.exam,
        totalMarks: r.exam.totalMarks ? Number(r.exam.totalMarks) : null,
        passMark:   r.exam.passMark   ? Number(r.exam.passMark)   : null,
      } : null,
    })),
    summary: {
      total:    aggregate._count.id,
      passed,
      failed,
      avgPct:   Math.round(Number(aggregate._avg.percentage  ?? 0)),
      bestPct:  Math.round(Number(aggregate._max.percentage  ?? 0)),
      worstPct: Math.round(Number(aggregate._min.percentage  ?? 0)),
    },
  };
};