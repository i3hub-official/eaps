// src/routes/student/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const [exams, results] = await prisma.$transaction([
    prisma.examSession.findMany({
      where: { studentId: user.id },
      orderBy: [
        { exam: { scheduledStart: 'asc' } },
      ],
      include: {
        exam: {
          include: {
            course: { select: { code: true, title: true } },
          },
        },
      },
    }),
    prisma.examResult.findMany({
      where: { studentId: user.id },
      orderBy: { generatedAt: 'desc' },
      include: {
        exam: {
          select: {
            title: true,
            course: { select: { code: true } },
          },
        },
      },
    }),
  ]);

  return {
    exams: exams.map(e => ({
      id: e.exam.id,
      sessionId: e.id,
      title: e.exam.title,
      courseCode: e.exam.course.code,
      courseTitle: e.exam.course.title,
      status: e.status,
      scheduledStart: e.exam.scheduledStart,
      scheduledEnd: e.exam.scheduledEnd,
      durationMinutes: e.exam.durationMinutes,
      totalMarks: e.exam.totalMarks,
      passMark: e.exam.passMark,
      score: e.score,
      isGraded: e.isGraded,
      violationCount: e.violationCount,
    })),
    results: results.map(r => ({
      id: r.id,
      examId: r.examId,
      examTitle: r.exam.title,
      courseCode: r.exam.course?.code,
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      submittedAt: r.submittedAt,
    })),
  };
};