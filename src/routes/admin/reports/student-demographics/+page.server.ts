import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [levels, colleges, departments] = await Promise.all([
    sql(
      `SELECT level, COUNT(*)::int AS count
       FROM users
       WHERE role = 'student' AND level IS NOT NULL
       GROUP BY level
       ORDER BY level`
    ),
    sql(
      `SELECT c.id, c.name, c.abbreviation, COUNT(u.id)::int AS students
       FROM colleges c
       LEFT JOIN departments d ON d.college_id = c.id
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'student'
       GROUP BY c.id, c.name, c.abbreviation
       ORDER BY students DESC`
    ),
    sql(
      `SELECT d.name, c.abbreviation AS college, COUNT(u.id)::int AS students
       FROM departments d
       LEFT JOIN colleges c ON d.college_id = c.id
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'student'
       GROUP BY d.id, d.name, c.abbreviation
       ORDER BY students DESC`
    ),
  ]);

  const totalStudents = levels.reduce((a: number, l: any) => a + (l.count || 0), 0);

  function pct(count: number) {
    return totalStudents > 0 ? parseFloat(((count / totalStudents) * 100).toFixed(1)) : 0;
  }

  return {
    byLevel: levels.map((l: any) => ({
      level:      l.level,
      count:      l.count || 0,
      percentage: pct(l.count),
    })),
    byCollege: colleges.map((c: any) => ({
      name:         c.name,
      abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(),
      count:        c.students || 0,
      percentage:   pct(c.students),
    })),
    byDepartment: departments.map((d: any) => ({
      name:       d.name,
      college:    d.college || '—',
      count:      d.students || 0,
      percentage: pct(d.students),
    })),
  };
};