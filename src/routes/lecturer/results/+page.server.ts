import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

const results = await sql(
  `SELECT
     e.id          AS exam_id,
     e.title       AS exam_title,
     c.code        AS course_code,
     e.status,
     e.scheduled_start,
     COALESCE(es.total_students, 0)  AS total_students,
     COALESCE(es.submitted, 0)       AS submitted,
     COALESCE(er.passed, 0)          AS passed,
     COALESCE(er.failed, 0)          AS failed,
     er.avg_score
   FROM exams e
   JOIN courses c ON c.id = e.course_id
   LEFT JOIN (
     SELECT
       exam_id,
       COUNT(*)::int                                                          AS total_students,
       COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted
     FROM exam_sessions
     GROUP BY exam_id
   ) es ON es.exam_id = e.id
   LEFT JOIN (
     SELECT
       exam_id,
       COUNT(*) FILTER (WHERE passed = true)::int  AS passed,
       COUNT(*) FILTER (WHERE passed = false)::int AS failed,
       ROUND(AVG(percentage)::numeric, 1)          AS avg_score
     FROM exam_results
     GROUP BY exam_id
   ) er ON er.exam_id = e.id
   WHERE e.created_by = $1
     AND e.status IN ('active', 'completed')
   ORDER BY e.scheduled_start DESC NULLS LAST`,
  [user.id]
);
  return { results };
};