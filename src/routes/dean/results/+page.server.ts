// src/routes/dean/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireDean(locals.user);
  const prisma    = await getPrismaClient();
  const collegeId = locals.user!.collegeId!;
  const page      = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take      = 25;

  const where = { exam: { course: { department: { collegeId } } } };
  const [results, total] = await Promise.all([
    prisma.examResult.findMany({
      where, orderBy: { generatedAt: 'desc' }, skip: (page - 1) * take, take,
      select: {
        id: true, percentage: true, passed: true, grade: true, violationCount: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: { select: { title: true, course: { select: { code: true, department: { select: { name: true } } } } } },
      },
    }),
    prisma.examResult.count({ where }),
  ]);

  return { results, total, page, take };
};