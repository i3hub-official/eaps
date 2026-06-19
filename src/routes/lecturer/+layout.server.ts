// src/routes/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = await requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  const [notifications, activeExams, totalExams, pendingGrades] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    30,
    }),

    prisma.exam.count({
      where: { createdBy: user.id, status: 'active' },
    }),

    prisma.exam.count({
      where: { createdBy: user.id, status: { not: 'cancelled' } },
    }),

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