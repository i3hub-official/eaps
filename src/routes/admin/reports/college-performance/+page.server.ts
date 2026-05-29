import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const colleges = await sql`
    SELECT 
      c.id,
      c.name,
      c.abbreviation,
      COUNT(DISTINCT u.id)::int as students,
      COUNT(DISTINCT e.id)::int as exams,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results
    FROM "College" c
    LEFT JOIN "Department" d ON d."collegeId" = c.id
    LEFT JOIN "User" u ON u."departmentId" = d.id AND u.role = 'student'
    LEFT JOIN "ExamSession" es ON es."studentId" = u.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    LEFT JOIN "Exam" e ON e."courseId" IN (SELECT id FROM "Course" WHERE "departmentId" = d.id)
    GROUP BY c.id
  `;

  const formatted = colleges.map((c: any) => {
    const totalResults = c.total_results || 0;
    const passed = c.passed || 0;
    const avgScore = parseFloat(c.avg_score) || 0;
    return {
      id: c.id,
      name: c.name,
      abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(),
      students: c.students || 0,
      exams: c.exams || 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: totalResults > 0 ? parseFloat(((passed / totalResults) * 100).toFixed(1)) : 0,
      topCourse: 'CSC 201',
      trend: totalResults > 0 && (passed / totalResults) >= 0.7 ? 'up' : 'stable',
    };
  });

  return { colleges: formatted };
};
