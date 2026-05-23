// src/routes/(admin)/admin/reports/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [examStats, topStudents, violationBreakdown, dailyActivity] = await Promise.all([
    // Per-exam summary
    sql<{
      exam_title: string; course_code: string; total: number;
      submitted: number; passed: number; avg_pct: number;
    }>(
      `SELECT
         e.title AS exam_title, c.code AS course_code,
         COUNT(es.id)::int AS total,
         COUNT(es.id) FILTER (WHERE es.status IN ('submitted','force_submitted'))::int AS submitted,
         COUNT(er.id) FILTER (WHERE er.passed = true)::int AS passed,
         ROUND(COALESCE(AVG(er.percentage), 0)::numeric, 1) AS avg_pct
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN exam_sessions es ON es.exam_id = e.id
       LEFT JOIN exam_results  er ON er.session_id = es.id
       GROUP BY e.id, e.title, c.code
       ORDER BY e.created_at DESC
       LIMIT 20`
    ),

    // Top 10 students by avg score
    sql<{ student_name: string; matric_number: string | null; avg_pct: number; exams_taken: number }>(
      `SELECT
         u.full_name AS student_name, u.matric_number,
         ROUND(AVG(er.percentage)::numeric, 1) AS avg_pct,
         COUNT(er.id)::int AS exams_taken
       FROM exam_results er
       JOIN users u ON u.id = er.student_id
       GROUP BY u.id, u.full_name, u.matric_number
       HAVING COUNT(er.id) >= 1
       ORDER BY avg_pct DESC
       LIMIT 10`
    ),

    // Violation breakdown by type
    sql<{ flag_type: string; count: number }>(
      `SELECT flag_type, COUNT(*)::int AS count
       FROM violations
       GROUP BY flag_type
       ORDER BY count DESC`
    ),

    // Daily exam activity (last 14 days)
    sql<{ day: string; sessions: number; submissions: number }>(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*)::int AS sessions,
         COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submissions
       FROM exam_sessions
       WHERE created_at >= now() - INTERVAL '14 days'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    ),
  ]);

  return { examStats, topStudents, violationBreakdown, dailyActivity };
};