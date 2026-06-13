// src/routes/invigilator/assignments/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireInvigilatorOrAdmin(locals.user);
          const prisma = await getPrismaClient();

  const assignments = await prisma.examInvigilator.findMany({
    where: { invigilatorId: locals.user.id },
    orderBy: { exam: { scheduledStart: 'desc' } },
    include: {
      exam: {
        include: {
          course: { select: { code: true, title: true } },
          lecturer: { select: { title: true, fullName: true } },
          _count: { select: { examSessions: true } },
        },
      },
    },
  });

  const now = new Date();

  const categorised = {
    upcoming:  assignments.filter(a =>
      a.exam.status === 'scheduled' &&
      (a.exam.scheduledStart ?? now) > now
    ),
    active:    assignments.filter(a => a.exam.status === 'active'),
    completed: assignments.filter(a =>
      a.exam.status === 'completed' || a.exam.status === 'cancelled' ||
      (a.exam.status === 'scheduled' && (a.exam.scheduledStart ?? now) <= now)
    ),
  };

  return { assignments, categorised };
};