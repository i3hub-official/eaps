import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      c.id,
      c.code,
      c.title,
      d.name as dept,
      COUNT(DISTINCT cr.id)::int as students,
      COUNT(DISTINCT e.id)::int as exams,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results
    FROM "Course" c
    LEFT JOIN "Department" d ON c."departmentId" = d.id
    LEFT JOIN "CourseRegistration" cr ON cr."courseId" = c.id
    LEFT JOIN "Exam" e ON e."courseId" = c.id
    LEFT JOIN "ExamResult" er ON er."examId" = e.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (c.code ILIKE ${'%' + searchQuery + '%'} OR c.title ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} GROUP BY c.id, d.name`;

  const courses = await query;

  const formatted = courses.map(c => {
    const avgScore = parseFloat(c.avg_score) || 0;
    const totalResults = c.total_results || 0;
    const passed = c.passed || 0;
    return {
      code: c.code,
      title: c.title,
      dept: c.dept || '—',
      students: c.students || 0,
      exams: c.exams || 0,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: totalResults > 0 ? ((passed / totalResults) * 100).toFixed(1) : '0',
      avgTime: 52,
      difficulty: avgScore >= 70 ? 'easy' : avgScore >= 50 ? 'medium' : 'hard',
      trend: (totalResults > 0 && (passed / totalResults) >= 0.7) ? 'up' : 'stable',
    };
  });

  return { courses: formatted };
};
