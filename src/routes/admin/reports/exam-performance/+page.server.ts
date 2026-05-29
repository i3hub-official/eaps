// src/routes/admin/reports/exam-performance/+page.server.ts
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const statusFilter = url.searchParams.get('status')?.trim() ?? '';
  const search       = url.searchParams.get('q')?.trim()      ?? '';

  // ── Build WHERE conditions with positional $N params ──────────────
  const conditions: string[] = ['1=1'];
  const params: unknown[]    = [];

  if (statusFilter && statusFilter !== 'all') {
    params.push(statusFilter);
    conditions.push(`e.status = $${params.length}::\"ExamStatus\"`);
  }

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(e.title ILIKE $${n} OR c.code ILIKE $${n})`);
  }

  const where = conditions.join(' AND ');

  // ── Column names from @@map / @map in schema.prisma ───────────────
  //   Exam:        scheduled_start, duration_minutes, course_id  (mapped)
  //   Course:      code                                           (not mapped)
  //   ExamSession: exam_id                                        (mapped)
  //   ExamResult:  exam_id, passed                               (mapped)
  const query = `
    SELECT
      e.id,
      e.title,
      e.status,
      e.scheduled_start,
      e.duration_minutes,
      c.code                                                AS course,
      COUNT(DISTINCT es.id)::int                           AS students,
      ROUND(AVG(er.percentage)::numeric, 1)                AS avg_score,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int    AS passed,
      COUNT(er.id)::int                                    AS total_results,
      SUM(COALESCE(es.violation_count, 0))::int            AS violations
    FROM exams e
    LEFT JOIN courses      c  ON c.id        = e.course_id
    LEFT JOIN exam_sessions es ON es.exam_id = e.id
    LEFT JOIN exam_results  er ON er.exam_id = e.id
    WHERE ${where}
    GROUP BY e.id, e.title, e.status, e.scheduled_start, e.duration_minutes, c.code
    ORDER BY e.scheduled_start DESC NULLS LAST
    LIMIT 200
  `;

  const rows = await sql(query, params);

  const exams = rows.map(e => {
    const totalResults = (e.total_results as number) || 0;
    const passed       = (e.passed       as number) || 0;

    return {
      id:         e.id                                          as string,
      title:      e.title                                       as string,
      course:     (e.course          as string | null) ?? '—',
      status:     e.status                                      as string,
      date:       e.scheduled_start
                    ? new Date(e.scheduled_start as string).toISOString().split('T')[0]
                    : '—',
      duration:   (e.duration_minutes as number) || 0,
      students:   (e.students         as number) || 0,
      avgScore:   parseFloat(e.avg_score as string) || 0,
      passRate:   totalResults > 0
                    ? parseFloat(((passed / totalResults) * 100).toFixed(1))
                    : 0,
      violations: (e.violations as number) || 0,
    };
  });

  return { exams };
};