// src/routes/lecturer/results/+layout.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const prisma = await getPrismaClient();

  // Get courses the lecturer teaches
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

  // Get unique sessions from exams the lecturer created
  const exams = await prisma.exam.findMany({
    where: { createdBy: user.id },
    select: { session: true },
    distinct: ['session'],
    orderBy: { session: 'desc' },
  });

  const sessions = exams.map(e => e.session);

  // Get levels
  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    select: { level: true },
  });

  return {
    courses,
    sessions,
    levels: levels.map(l => l.level),
  };
};