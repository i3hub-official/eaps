import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      d.id,
      d.name,
      c.abbreviation as college,
      COUNT(DISTINCT u.id)::int as students,
      COUNT(DISTINCT e.id)::int as exams,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results
    FROM "Department" d
    LEFT JOIN "College" c ON d."collegeId" = c.id
    LEFT JOIN "User" u ON u."departmentId" = d.id AND u.role = 'student'
    LEFT JOIN "ExamSession" es ON es."studentId" = u.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    LEFT JOIN "Exam" e ON e."courseId" IN (SELECT id FROM "Course" WHERE "departmentId" = d.id)
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND d.name ILIKE ${'%' + searchQuery + '%'}`;
  }

  query = sql`${query} GROUP BY d.id, c.abbreviation`;

  const departments = await query;

  const formatted = departments.map((d: any) => {
    const totalResults = d.total_results || 0;
    const passed = d.passed || 0;
    const avgScore = parseFloat(d.avg_score) || 0;
    return {
      id: d.id,
      name: d.name,
      college: d.college || '—',
      students: d.students || 0,
      exams: d.exams || 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: totalResults > 0 ? parseFloat(((passed / totalResults) * 100).toFixed(1)) : 0,
      trend: totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : totalResults > 0 && (passed / totalResults) >= 0.5 ? 'stable' : 'down',
    };
  });

  return { departments: formatted };
};
