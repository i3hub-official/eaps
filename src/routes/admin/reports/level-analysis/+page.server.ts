import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const levels = await sql`
    SELECT 
      u.level,
      COUNT(DISTINCT u.id)::int as students,
      COUNT(DISTINCT e.id)::int as exams,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results,
      MODE() WITHIN GROUP (ORDER BY d.name) as top_dept
    FROM "User" u
    LEFT JOIN "Department" d ON u."departmentId" = d.id
    LEFT JOIN "ExamSession" es ON es."studentId" = u.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    LEFT JOIN "Exam" e ON e.id = es."examId"
    WHERE u.role = 'student' AND u.level IS NOT NULL
    GROUP BY u.level
    ORDER BY u.level
  `;

  const formatted = levels.map((l: any) => {
    const totalResults = l.total_results || 0;
    const passed = l.passed || 0;
    const avgScore = parseFloat(l.avg_score) || 0;
    return {
      level: l.level,
      students: l.students || 0,
      exams: l.exams || 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: totalResults > 0 ? parseFloat(((passed / totalResults) * 100).toFixed(1)) : 0,
      topDept: l.top_dept || '—',
      trend: totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { levels: formatted };
};
