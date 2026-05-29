import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const levels = await sql`
    SELECT level, COUNT(*)::int as count FROM "User" WHERE role = 'student' AND level IS NOT NULL GROUP BY level ORDER BY level
  `;

  const colleges = await sql`
    SELECT c.id, c.name, c.abbreviation, COUNT(u.id)::int as students
    FROM "College" c
    LEFT JOIN "Department" d ON d."collegeId" = c.id
    LEFT JOIN "User" u ON u."departmentId" = d.id AND u.role = 'student'
    GROUP BY c.id
  `;

  const departments = await sql`
    SELECT d.name, c.abbreviation as college, COUNT(u.id)::int as students
    FROM "Department" d
    LEFT JOIN "College" c ON d."collegeId" = c.id
    LEFT JOIN "User" u ON u."departmentId" = d.id AND u.role = 'student'
    GROUP BY d.id, c.abbreviation
  `;

  const totalStudents = levels.reduce((a: number, l: any) => a + (l.count || 0), 0);

  const byLevel = levels.map((l: any) => ({
    level: l.level,
    count: l.count || 0,
    percentage: totalStudents > 0 ? parseFloat(((l.count / totalStudents) * 100).toFixed(1)) : 0,
  }));

  const byCollege = colleges.map((c: any) => ({
    name: c.name,
    abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(),
    count: c.students || 0,
    percentage: totalStudents > 0 ? parseFloat(((c.students / totalStudents) * 100).toFixed(1)) : 0,
  }));

  const byDepartment = departments.map((d: any) => ({
    name: d.name,
    college: d.college || '—',
    count: d.students || 0,
    percentage: totalStudents > 0 ? parseFloat(((d.students / totalStudents) * 100).toFixed(1)) : 0,
  }));

  return { byLevel, byCollege, byDepartment };
};
