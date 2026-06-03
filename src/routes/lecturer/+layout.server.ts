// src/routes/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

  const [notifications, activeExams, totalExams, pendingGrades] = await Promise.all([
    // Latest 30 notifications for this user
    prisma.notification.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    30,
    }),

    // Exams currently active
    prisma.exam.count({
      where: { createdBy: user.id, status: 'active' },
    }),

    // All non-cancelled exams
    prisma.exam.count({
      where: { createdBy: user.id, status: { not: 'cancelled' } },
    }),

    // Sessions that are submitted but not yet graded
    prisma.examSession.count({
      where: {
        exam:     { createdBy: user.id },
        status:   'submitted',
        isGraded: false,
      },
    }),
  ]);

  return {
    user,
    notifications,
    stats: { activeExams, totalExams, pendingGrades },
  };
};