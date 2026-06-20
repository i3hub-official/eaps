// src/routes/dean/departments/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireDean(locals.user);
  const prisma = await getPrismaClient();
  const collegeId = locals.user!.collegeId!;

  const departments = await prisma.department.findMany({
    where: { collegeId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, courses: true } },
    },
  });

  return { departments };
};
