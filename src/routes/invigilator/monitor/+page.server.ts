// src/routes/invigilator/monitor/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireInvigilatorOrAdmin(locals.user);

  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ['active', 'scheduled'] },
      invigilators: {
        some: { invigilatorId: locals.user!.id },
      },
    },
    include: {
      course: { select: { code: true, title: true } },
      _count: { select: { examSessions: true } },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  return { exams };
};