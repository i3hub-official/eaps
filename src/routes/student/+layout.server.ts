
// src/routes/(student)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  // Fetch full student profile with all relations
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      college: true,
      level: true,
      programme: true,
      faceDescriptor: {
  select: { studentId: true, enrolledAt: true },
},
    },
  });

const [
  notifications,
  activeExams,
  totalResults,
  upcomingExams,
  pendingRegistrations,
  activeExamSession,
] = await Promise.all([
  prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }),
  prisma.examSession.count({
    where: {
      studentId: user.id,
      status: { in: ['active', 'in_progress'] },
    },
  }),
  prisma.examResult.count({
    where: { studentId: user.id },
  }),
  prisma.examSession.count({
    where: {
      studentId: user.id,
      status: 'not_started',
      exam: { scheduledStart: { gt: new Date() } },
    },
  }),
  prisma.courseRegistration.count({
    where: {
      studentId: user.id,
      session: user.session ?? '',
    },
  }),
  prisma.examSession.findFirst({
    where: {
      studentId: user.id,
      status: { in: ['active', 'in_progress'] },
    },
    include: { exam: { select: { title: true } } },
  }),
]);

  return {
    user: {
      ...user,
      ...fullUser,
      enrolled: !!fullUser?.faceDescriptor,
    },
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