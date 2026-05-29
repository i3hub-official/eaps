import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      c.id,
      c.code,
      c.title,
      d.name as dept,
      COUNT(DISTINCT cr.id)::int as enrolled,
      c."creditUnits",
      c.level
    FROM "Course" c
    LEFT JOIN "Department" d ON c."departmentId" = d.id
    LEFT JOIN "CourseRegistration" cr ON cr."courseId" = c.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (c.code ILIKE ${'%' + searchQuery + '%'} OR c.title ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} GROUP BY c.id, d.name`;

  const courses = await query;

  const formatted = courses.map((c: any) => ({
    code: c.code,
    title: c.title,
    dept: c.dept || '—',
    enrolled: c.enrolled || 0,
    capacity: 300,
    trend: (c.enrolled || 0) > 200 ? 'up' : 'stable',
    semester: 1,
    session: '2025/2026',
  }));

  return { courses: formatted };
};
