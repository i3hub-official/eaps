// src/routes/(lecturer)/exams/+page.server.ts
import type { PageServerLoad } from './exams/$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { listExamsByLecturer } from '$lib/server/db/exams.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const exams = await listExamsByLecturer(user.id);
  const courses = await prisma.course.findMany({
    where: { department: { users: { some: { id: user.id } } } },
    include: { department: true },
    orderBy: { code: 'asc' },
  });
  return { user, exams, courses };
};