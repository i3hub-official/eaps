// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  const [
    recentExams,
    recentResults,
    registeredCourses,
    unreadNotifications,
  ] = await Promise.all([
    // Recent/upcoming exams
    prisma.exam.findMany({
      where: {
        status: { in: ['scheduled', 'active'] },
        session: currentSession,
        semester: currentSemester,
        course: {
          registrations: {
            some: { studentId: user.id, session: currentSession, semester: currentSemester },
          },
        },
      },
      take: 5,
      orderBy: { scheduledStart: 'asc' },
      include: {
        course: { select: { code: true, title: true } },
        examSessions: {
          where: { studentId: user.id },
          select: { id: true, status: true, score: true },
        },
      },
    }),
    // Recent results
    prisma.examResult.findMany({
      where: { studentId: user.id },
      take: 5,
      orderBy: { generatedAt: 'desc' },
      include: {
        exam: {
          select: {
            title: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
    }),
    // Course count
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
    // Unread notifications
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return {
    recentExams: recentExams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      status: e.status,
      scheduledStart: e.scheduledStart,
      scheduledEnd: e.scheduledEnd,
      durationMinutes: e.durationMinutes,
      sessionStatus: e.examSessions[0]?.status ?? null,
      sessionId: e.examSessions[0]?.id ?? null,
    })),
    recentResults: recentResults.map(r => ({
      id: r.id,
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
      registeredCourses,
      unreadNotifications,
    },
  };
};

function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 10) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}