// src/routes/lecturer/+page.server.ts
import type { PageServerLoad } from '../$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { listExamsByLecturer } from '$lib/server/db/exams.js';
import { sql } from '$lib/server/db/index.js';
import { serializePrismaData } from '$lib/utils/serialize';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

  // Get ALL exams for this lecturer (including draft, scheduled, active, completed, cancelled)
  const exams = await listExamsByLecturer(user.id);

  // If no exams, return empty stats
  if (exams.length === 0) {
    return { user, exams: [], statsMap: {} };
  }

  // Quick stats per exam - including all statuses
  const stats = await sql<{ exam_id: string; total: number; submitted: number; avg_pct: number; total_questions: number }>(
    `SELECT
       es.exam_id,
       COUNT(*)::int                                                   AS total,
       COUNT(*) FILTER (WHERE es.status IN ('submitted','force_submitted'))::int AS submitted,
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0)             AS avg_pct,
       (SELECT COUNT(*)::int FROM questions WHERE exam_id = es.exam_id) AS total_questions
     FROM exam_sessions es
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = ANY($1::uuid[])
     GROUP BY es.exam_id`,
    [exams.map(e => e.id)]
  );

  const statsMap = Object.fromEntries(stats.map(s => [s.exam_id, s]));

  // Serialize exams to handle Decimal/BigInt values
  const serializedExams = serializePrismaData(exams);

  // Serialize statsMap as well
  const serializedStatsMap = serializePrismaData(statsMap);

  return { 
    user, 
    exams: serializedExams, 
    statsMap: serializedStatsMap 
  };
};