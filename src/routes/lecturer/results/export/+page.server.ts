// src/routes/lecturer/results/export/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async (event) => {
   const user = await requireLecturer(event.locals.user);
  const prisma = await getPrismaClient();

  // Get courses for filter dropdown
  const courses = await prisma.course.findMany({
    where: {
      lecturerAssignments: {
        some: { lecturerId: user.id }
      }
    },
    select: {
      id: true,
      code: true,
      title: true,
    },
    orderBy: { code: 'asc' },
  });

  // Get exams for filter dropdown
  const exams = await prisma.exam.findMany({
    where: { createdBy: user.id },
    select: {
      id: true,
      title: true,
      course: {
        select: { code: true },
      },
    },
    orderBy: { scheduledStart: 'desc' },
  });

  return {
    courses,
    exams: exams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
    })),
  };
};