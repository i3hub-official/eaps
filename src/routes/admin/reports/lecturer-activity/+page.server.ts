import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const search = url.searchParams.get('q')?.trim() || '';

  const lecturers = await sql(
    `SELECT
       u.id,
       u.full_name,
       d.name AS dept,
       COUNT(DISTINCT e.id)::int                                        AS exams_created,
       COUNT(DISTINCT es.id)::int                                       AS total_students,
       ROUND(AVG(er.score)::numeric, 1)                                 AS avg_score,
       COUNT(er.id) FILTER (WHERE er.passed = true)::int                AS passed,
       COUNT(er.id)::int                                                AS total_results,
       COALESCE(SUM(e.duration_minutes) / 60, 0)::int                   AS total_hours
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN exams e ON e.created_by = u.id
     LEFT JOIN exam_sessions es ON es.exam_id = e.id
     LEFT JOIN exam_results er ON er.exam_id = e.id
     WHERE u.role = 'lecturer'
       ${search ? `AND u.full_name ILIKE $1` : ''}
     GROUP BY u.id, u.full_name, d.name
     ORDER BY exams_created DESC`,
    search ? [`%${search}%`] : []
  );

  const formatted = lecturers.map((l: any) => {
    const totalResults = l.total_results || 0;
    const passed       = l.passed       || 0;
    const avgScore     = parseFloat(l.avg_score) || 0;

    return {
      id:           l.id,
      name:         l.full_name,
      dept:         l.dept        || '—',
      examsCreated: l.exams_created || 0,
      totalStudents: l.total_students || 0,
      avgPassRate:  totalResults > 0
        ? parseFloat(((passed / totalResults) * 100).toFixed(1))
        : 0,
      avgScore:     parseFloat(avgScore.toFixed(1)),
      totalHours:   l.total_hours  || 0,
      trend:        totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { lecturers: formatted };
};