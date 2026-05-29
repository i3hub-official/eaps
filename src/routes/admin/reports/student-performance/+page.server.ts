import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const levelFilter = url.searchParams.get('level');
  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      u.id,
      u."fullName",
      u."matricNumber",
      d.name as dept,
      u.level,
      COUNT(DISTINCT es.id)::int as exams_taken,
      AVG(er.score)::numeric(10,1) as avg_score,
      MAX(er.score)::numeric(10,1) as highest,
      MIN(er.score)::numeric(10,1) as lowest,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(v.id)::int as violations
    FROM "User" u
    LEFT JOIN "Department" d ON u."departmentId" = d.id
    LEFT JOIN "ExamSession" es ON es."studentId" = u.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    LEFT JOIN "Violation" v ON v."sessionId" = es.id
    WHERE u.role = 'student'
  `;

  if (levelFilter) {
    query = sql`${query} AND u.level = ${parseInt(levelFilter)}`;
  }

  if (searchQuery) {
    query = sql`${query} AND (u."fullName" ILIKE ${'%' + searchQuery + '%'} OR u."matricNumber" ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} GROUP BY u.id, d.name LIMIT 100`;

  const students = await query;

  const formatted = students.map(s => {
    const avgScore = parseFloat(s.avg_score) || 0;
    const examsTaken = s.exams_taken || 0;
    const passed = s.passed || 0;
    return {
      id: s.id,
      name: s.fullName,
      matric: s.matricNumber || '—',
      dept: s.dept || '—',
      level: s.level || 0,
      examsTaken,
      avgScore: parseFloat(avgScore.toFixed(1)),
      highest: parseFloat(s.highest) || 0,
      lowest: parseFloat(s.lowest) || 0,
      passRate: examsTaken > 0 ? ((passed / examsTaken) * 100).toFixed(1) : '0',
      violations: s.violations || 0,
      trend: avgScore >= 60 ? 'up' : 'down',
    };
  });

  return { students: formatted };
};
