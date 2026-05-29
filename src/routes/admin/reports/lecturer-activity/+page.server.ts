import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      u.id,
      u."fullName",
      d.name as dept,
      COUNT(DISTINCT e.id)::int as exams_created,
      COUNT(DISTINCT es.id)::int as total_students,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results,
      SUM(e."durationMinutes")::int as total_hours
    FROM "User" u
    LEFT JOIN "Department" d ON u."departmentId" = d.id
    LEFT JOIN "Exam" e ON e."createdBy" = u.id
    LEFT JOIN "ExamSession" es ON es."examId" = e.id
    LEFT JOIN "ExamResult" er ON er."examId" = e.id
    WHERE u.role = 'lecturer'
  `;

  if (searchQuery) {
    query = sql`${query} AND u."fullName" ILIKE ${'%' + searchQuery + '%'}`;
  }

  query = sql`${query} GROUP BY u.id, d.name`;

  const lecturers = await query;

  const formatted = lecturers.map((l: any) => {
    const totalResults = l.total_results || 0;
    const passed = l.passed || 0;
    const avgScore = parseFloat(l.avg_score) || 0;
    return {
      id: l.id,
      name: l.fullName,
      dept: l.dept || '—',
      examsCreated: l.exams_created || 0,
      totalStudents: l.total_students || 0,
      avgPassRate: totalResults > 0 ? parseFloat(((passed / totalResults) * 100).toFixed(1)) : 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      totalHours: l.total_hours || 0,
      trend: totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { lecturers: formatted };
};
