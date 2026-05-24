// src/routes/lecturer/+page.server.ts
import type { PageServerLoad } from '../$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { listExamsByLecturer } from '$lib/server/db/exams.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

  const exams = await listExamsByLecturer(user.id);

  // Quick stats per exam
  const stats = await sql<{ exam_id: string; total: number; submitted: number; avg_pct: number }>(
    `SELECT
       es.exam_id,
       COUNT(*)::int                                                   AS total,
       COUNT(*) FILTER (WHERE es.status IN ('submitted','force_submitted'))::int AS submitted,
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0)             AS avg_pct
     FROM exam_sessions es
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = ANY($1::uuid[])
     GROUP BY es.exam_id`,
    [exams.map(e => e.id)]
  );

  const statsMap = Object.fromEntries(stats.map(s => [s.exam_id, s]));

  return { user, exams, statsMap };
};