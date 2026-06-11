// src/routes/student/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const { session: currentSession, semester: currentSemester } = await getActiveSemester();

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        include: {
          exams: {
            where: {
              status: { in: ['active', 'scheduled', 'completed', 'cancelled'] },
            },
            include: {
              examSessions: {
                where: { studentId: user.id },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const examEntries: Array<{
    id: string;
    sessionId: string | null;
    title: string;
    courseCode: string;
    courseTitle: string;
    status: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    durationMinutes: number;
    totalMarks: number;
    passMark: number;
    score: number | null;
    isGraded: boolean;
    violationCount: number;
    registrationType: string;
  }> = [];

  for (const reg of registrations) {
    for (const exam of reg.course.exams) {
      const session = exam.examSessions[0];

      examEntries.push({
        id: exam.id,
        sessionId: session?.id ?? null,
        title: exam.title,
        courseCode: reg.course.code,
        courseTitle: reg.course.title,
        status:
          exam.status === 'cancelled'
            ? 'cancelled'
            : (session?.status ?? 'not_started'),
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        score: session?.score ?? null,
        isGraded: session?.isGraded ?? false,
        violationCount: session?.violationCount ?? 0,
        registrationType: reg.registrationType,
      });
    }
  }

  const results = await prisma.examResult.findMany({
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
  });

  return {
    exams: examEntries,
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
    meta: {
      session: currentSession,
      semester: currentSemester,
    },
  };
};