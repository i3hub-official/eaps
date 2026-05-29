import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const colleges = await sql(
    `SELECT
       c.id,
       c.name,
       c.abbreviation,
       COUNT(DISTINCT u.id)::int                                        AS students,
       COUNT(DISTINCT e.id)::int                                        AS exams,
       ROUND(AVG(er.score)::numeric, 1)                                 AS avg_score,
       COUNT(er.id) FILTER (WHERE er.passed = true)::int                AS passed,
       COUNT(er.id)::int                                                AS total_results,
       (
         SELECT co.code
         FROM courses co
         JOIN departments dd ON co.department_id = dd.id
         JOIN exam_results er2 ON er2.exam_id IN (
           SELECT id FROM exams WHERE course_id = co.id
         )
         WHERE dd.college_id = c.id
         GROUP BY co.code
         ORDER BY COUNT(er2.id) DESC
         LIMIT 1
       ) AS top_course
     FROM colleges c
     LEFT JOIN departments d      ON d.college_id = c.id
     LEFT JOIN users u            ON u.department_id = d.id AND u.role = 'student'
     LEFT JOIN exam_sessions es   ON es.student_id = u.id
     LEFT JOIN exam_results er    ON er.session_id = es.id
     LEFT JOIN exams e            ON e.course_id IN (
       SELECT id FROM courses WHERE department_id = d.id
     )
     GROUP BY c.id, c.name, c.abbreviation
     ORDER BY students DESC`
  );

  const formatted = colleges.map((c: any) => {
    const totalResults = c.total_results || 0;
    const passed       = c.passed       || 0;
    const avgScore     = parseFloat(c.avg_score) || 0;

    return {
      id:           c.id,
      name:         c.name,
      abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(),
      students:     c.students     || 0,
      exams:        c.exams        || 0,
      avgScore:     parseFloat(avgScore.toFixed(1)),
      passRate:     totalResults > 0
        ? parseFloat(((passed / totalResults) * 100).toFixed(1))
        : 0,
      topCourse:    c.top_course   || '—',
      trend:        totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { colleges: formatted };
};