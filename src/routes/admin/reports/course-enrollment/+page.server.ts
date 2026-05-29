// src/routes/reports/course-enrollment/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  const courses = await prisma.course.findMany({
    where: searchQuery
      ? {
          OR: [
            { code:  { contains: searchQuery, mode: 'insensitive' } },
            { title: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      department:    { select: { name: true } },
      registrations: { select: { id: true } },
    },
    orderBy: { code: 'asc' },
  });

  const formatted = courses.map(c => ({
    code:     c.code,
    title:    c.title,
    dept:     c.department?.name ?? '—',
    enrolled: c.registrations.length,
    capacity: 300,
    trend:    c.registrations.length > 200 ? 'up' : 'stable',
    semester: 1,
    session:  '2025/2026',
  }));

  return { courses: formatted };
};