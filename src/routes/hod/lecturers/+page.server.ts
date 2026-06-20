// src/routes/hod/lecturers/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireHod(locals.user);
  const prisma = await getPrismaClient();
  const deptId = locals.user!.departmentId!;

  const lecturers = await prisma.user.findMany({
    where: {
      departmentId: deptId,
      role: { in: ['lecturer', 'hod'] },
      isActive: true,
    },
    orderBy: { fullName: 'asc' },
    select: {
      id: true, fullName: true, email: true, staffId: true, role: true,
      secondaryRoles: { select: { role: true } },
      lecturerCourses: {
        select: { course: { select: { code: true, title: true } } },
      },
      _count: { select: { createdExams: true } },
    },
  });

  return { lecturers };
};
