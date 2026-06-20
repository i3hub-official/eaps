// src/routes/dean/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireDean(locals.user);
  const prisma    = await getPrismaClient();
  const collegeId = locals.user!.collegeId!;
  const status    = url.searchParams.get('status') || '';
  const page      = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take      = 20;

  const where = {
    course: { department: { collegeId } },
    ...(status ? { status: status as any } : {}),
  };

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take,
      select: {
        id: true, title: true, status: true, scheduledStart: true,
        durationMinutes: true, session: true, semester: true,
        course: { select: { code: true, title: true, department: { select: { name: true } } } },
        lecturer: { select: { fullName: true } },
        _count: { select: { examSessions: true } },
      },
    }),
    prisma.exam.count({ where }),
  ]);

  return { exams, total, page, take, status };
};
