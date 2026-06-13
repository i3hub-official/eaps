// src/routes/lecturer/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js'; 
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user =  await requireLecturer(locals.user);

  const [
    allExams,
    totalStudents,
    resultStats,
    upcomingExams,
  ] = await Promise.all([
    // All exams created by this lecturer, recent first
    prisma.exam.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledStart: true,
        createdAt: true,
        durationMinutes: true,
        questionsToPresent: true,
        course: { select: { code: true, title: true } },
        _count: { select: { questions: true, examSessions: true } },
      },
    }),

    // Total unique students who have sat any of this lecturer's exams
    prisma.examSession.groupBy({
      by: ['studentId'],
      where: { exam: { createdBy: user.id } },
    }).then(rows => rows.length),

    // Aggregate results across all lecturer's completed exams
    prisma.examResult.aggregate({
      where: { exam: { createdBy: user.id } },
      _avg: { percentage: true },
      _count: { id: true },
    }),

    // Exams scheduled in the future
    prisma.exam.findMany({
      where: {
        createdBy: user.id,
        status: 'scheduled',
        scheduledStart: { gt: new Date() },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        course: { select: { code: true } },
      },
    }),
  ]);

  // Pending grades = submitted sessions with no ExamResult yet
  const pendingGrades = await prisma.examSession.count({
    where: {
      exam: { createdBy: user.id },
      status: { in: ['submitted', 'force_submitted'] },
      examResult: null,
    },
  });

  // Pass rate
  const passCount = await prisma.examResult.count({
    where: { exam: { createdBy: user.id }, passed: true },
  });
  const totalGraded = resultStats._count.id;
  const passRate = totalGraded > 0 ? Math.round((passCount / totalGraded) * 100) : 0;

  const activeExams = allExams.filter(e => e.status === 'active').length;

  return {
    stats: {
      activeExams,
      totalExams:    allExams.length,
      totalStudents,
      avgScore:      Math.round(Number(resultStats._avg.percentage ?? 0)),
      pendingGrades,
      passRate,
    },
    recentExams:   allExams.slice(0, 6),
    upcomingExams,
  };
};