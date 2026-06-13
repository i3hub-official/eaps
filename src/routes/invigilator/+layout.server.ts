// src/routes/invigilator/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = await requireInvigilatorOrAdmin(locals.user);
          const prisma = await getPrismaClient();

  const [notifications, liveSessions] = await Promise.all([
    // Latest 30 notifications for this user
    prisma.notification.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    30,
    }),

    // Sessions currently in progress across exams this invigilator is assigned to
    prisma.examSession.count({
      where: {
        invigilatorId: user.id,
        status:        'in_progress',
      },
    }),
  ]);

  return {
    user,
    notifications,
    stats: { liveSessions },
  };
};