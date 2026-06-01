import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const sessions = await sql(
    `SELECT
       e.session,
       e.semester,
       COUNT(DISTINCT e.id)::int    AS exams,
       COUNT(DISTINCT es.id)::int   AS students,
       AVG(er.score)::numeric(10,1) AS avg_score,
       COUNT(CASE WHEN er.passed = true THEN 1 END)::int AS passed,
       COUNT(er.id)::int            AS total_results
     FROM "Exam" e
     LEFT JOIN "ExamSession" es ON es."examId" = e.id
     LEFT JOIN "ExamResult"   er ON er."sessionId" = es.id
     GROUP BY e.session, e.semester
     ORDER BY e.session, e.semester`,
    []
  );

  const formatted = sessions.map((s: any) => {
    const totalResults = s.total_results || 0;
    const passed = s.passed || 0;
    const avgScore = parseFloat(s.avg_score) || 0;
    return {
      session: s.session,
      semester: s.semester,
      exams: s.exams || 0,
      students: s.students || 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: totalResults > 0 ? parseFloat(((passed / totalResults) * 100).toFixed(1)) : 0,
      trend: totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { sessions: formatted };
};