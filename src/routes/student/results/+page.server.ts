import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const results = await prisma.examResult.findMany({
    where: { studentId: user.id },
    orderBy: { generatedAt: 'desc' },
    include: {
      exam: {
        select: {
          title: true,
          durationMinutes: true,
          totalMarks: true,
          passMark: true,
          course: { select: { code: true, title: true, creditUnits: true } },
        },
      },
      session: {
        select: {
          startedAt: true,
          submittedAt: true,
          violationCount: true,
        },
      },
    },
  });

  // Aggregate stats
  const totalExams = results.length;
  const passedExams = results.filter(r => r.passed).length;
  const failedExams = totalExams - passedExams;
  const avgPercentage = totalExams > 0
    ? results.reduce((sum, r) => sum + Number(r.percentage ?? 0), 0) / totalExams
    : 0;
  const totalCreditUnits = results
    .filter(r => r.passed)
    .reduce((sum, r) => sum + (r.exam.course?.creditUnits ?? 0), 0);

  return {
    results: results.map(r => ({
      id: r.id,
      examId: r.examId,
      examTitle: r.exam.title,
      courseCode: r.exam.course?.code ?? '—',
      courseTitle: r.exam.course?.title ?? '—',
      creditUnits: r.exam.course?.creditUnits ?? 0,
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      totalMarks: r.exam.totalMarks,
      passMark: r.exam.passMark,
      durationMinutes: r.exam.durationMinutes,
      startedAt: r.session?.startedAt,
      submittedAt: r.submittedAt,
      violationCount: r.violationCount,
      generatedAt: r.generatedAt,
    })),
    stats: {
      totalExams,
      passedExams,
      failedExams,
      avgPercentage: Number(avgPercentage.toFixed(2)),
      totalCreditUnits,
    },
  };
};