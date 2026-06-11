// src/routes/student/exam/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
  const { session: currentSession, semester: currentSemester } = await getActiveSemester();

  // All registrations — no status filter.
  // carry_over = 'pending' must still show exams.
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session:   currentSession,
      semester:  currentSemester,
    },
    include: {
      course: {
        select: {
          code: true, title: true,
          exams: {
            where: {
              session:  currentSession,
              semester: currentSemester,
              status:   { not: 'cancelled' },
            },
            include: {
              examSessions: {
                where: { studentId: user.id },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const exams: {
    id: string; title: string; courseCode: string; courseTitle: string;
    durationMinutes: number; totalMarks: number; passMark: number;
    scheduledStart: Date | null; scheduledEnd: Date | null;
    status: string; registrationType: string;
    sessionStatus: string | null; sessionId: string | null;
    score: number | null; isGraded: boolean; violationCount: number;
  }[] = [];

  for (const reg of registrations) {
    for (const exam of reg.course.exams) {
      const session = exam.examSessions[0];
      exams.push({
        id:               exam.id,
        title:            exam.title,
        courseCode:       reg.course.code,
        courseTitle:      reg.course.title,
        durationMinutes:  exam.durationMinutes,
        totalMarks:       exam.totalMarks,
        passMark:         exam.passMark,
        scheduledStart:   exam.scheduledStart,
        scheduledEnd:     exam.scheduledEnd,
        status:           exam.status,
        registrationType: reg.registrationType,
        sessionStatus:    session?.status      ?? null,
        sessionId:        session?.id          ?? null,
        score:            session?.score       != null ? Number(session.score) : null,
        isGraded:         session?.isGraded    ?? false,
        violationCount:   session?.violationCount ?? 0,
      });
    }
  }

  // Active first, then by schedule
  exams.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    if (a.scheduledStart && b.scheduledStart)
      return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
    return 0;
  });

  return {
    exams,
    meta: { session: currentSession, semester: currentSemester, totalExams: exams.length },
  };
};
