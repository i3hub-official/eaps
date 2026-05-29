import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const statusFilter = url.searchParams.get('status');
  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      e.id,
      e.title,
      c.code as course,
      e."scheduledStart",
      e."durationMinutes",
      e.status,
      COUNT(DISTINCT es.id)::int as students,
      AVG(er.score)::numeric(10,1) as avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(er.id)::int as total_results
    FROM "Exam" e
    LEFT JOIN "Course" c ON e."courseId" = c.id
    LEFT JOIN "ExamSession" es ON es."examId" = e.id
    LEFT JOIN "ExamResult" er ON er."examId" = e.id
    WHERE 1=1
  `;

  if (statusFilter && statusFilter !== 'all') {
    query = sql`${query} AND e.status = ${statusFilter}`;
  }

  if (searchQuery) {
    query = sql`${query} AND (e.title ILIKE ${'%' + searchQuery + '%'} OR c.code ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} GROUP BY e.id, c.code ORDER BY e."scheduledStart" DESC`;

  const exams = await query;

  const formatted = exams.map(e => ({
    id: e.id,
    title: `${e.course} — ${e.title}`,
    course: e.course,
    date: e.scheduledStart ? new Date(e.scheduledStart).toISOString().split('T')[0] : '—',
    students: e.students || 0,
    avgScore: parseFloat(e.avg_score) || 0,
    passRate: e.total_results > 0 ? ((e.passed / e.total_results) * 100).toFixed(1) : '0',
    duration: e.durationMinutes,
    violations: 0,
    status: e.status,
  }));

  return { exams: formatted };
};
