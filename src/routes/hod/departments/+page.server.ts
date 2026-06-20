// src/routes/hod/departments/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireHod(locals.user);
  const prisma = await getPrismaClient();
  const deptId = locals.user!.departmentId!;

  const department = await prisma.department.findUnique({
    where: { id: deptId },
    include: {
      college: true,
      courses: { orderBy: [{ level: 'asc' }, { code: 'asc' }] },
      programmes: { orderBy: { name: 'asc' } },
      _count: { select: { users: true, courses: true, programmes: true } },
    },
  });

  return { department };
};