// src/routes/(student)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const [
    notifications,
    activeExams,
    totalResults,
    upcomingExams,
    pendingRegistrations,
    activeExamSession
  ] = await prisma.$transaction([
    // Notifications
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // Active exams count
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: { in: ['active', 'in_progress'] },
      },
    }),
    // Total results
    prisma.examResult.count({
      where: { studentId: user.id },
    }),
    // Upcoming exams (scheduled, not started)
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: 'not_started',
        exam: { scheduledStart: { gt: new Date() } },
      },
    }),
    // Pending course registrations
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: user.session ?? '',
      },
    }),
    // Active exam session (if any)
    prisma.examSession.findFirst({
      where: {
        studentId: user.id,
        status: { in: ['active', 'in_progress'] },
      },
      include: { exam: { select: { title: true } } },
    }),
  ]);

  return {
    user,
    notifications,
    stats: {
      activeExams,
      totalResults,
      upcomingExams,
      pendingRegistrations,
    },
    activeExamSession: activeExamSession ? {
      id: activeExamSession.id,
      examTitle: activeExamSession.exam.title,
    } : null,
  };
};