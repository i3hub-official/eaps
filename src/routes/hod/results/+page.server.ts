// src/routes/hod/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireHod(locals.user);
  const prisma = await getPrismaClient();
  const deptId = locals.user!.departmentId!;
  const page   = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take   = 25;

  const [results, total] = await Promise.all([
    prisma.examResult.findMany({
      where: { exam: { examDepartments: { some: { departmentId: deptId } } } },
      orderBy: { generatedAt: 'desc' },
      skip: (page - 1) * take,
      take,
      select: {
        id: true, score: true, percentage: true, passed: true,
        grade: true, violationCount: true, timeTakenSecs: true, submittedAt: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: { select: { title: true, course: { select: { code: true } } } },
      },
    }),
    prisma.examResult.count({
      where: { exam: { examDepartments: { some: { departmentId: deptId } } } },
    }),
  ]);

  return { results, total, page, take };
};
