// src/routes/admin/reports/student-performance/+page.server.ts
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const levelFilter = url.searchParams.get('level');
  const search      = url.searchParams.get('q')?.trim() ?? '';

  // ── Build query dynamically with positional $N params ─────────────
  // sql() is a plain function: sql(text, params[]) — NOT a template tag.
  // Conditions are accumulated and interpolated at build time.
  const conditions: string[] = [`u.role = 'student'`];
  const params: unknown[]    = [];

  if (levelFilter) {
    params.push(parseInt(levelFilter, 10));
    conditions.push(`u.level = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(u."fullName" ILIKE $${n} OR u."matricNumber" ILIKE $${n})`);
  }

  const where = conditions.join(' AND ');

  // Column names come from @map / @@map in schema.prisma — never Prisma camelCase
  const query = `
    SELECT
      u.id,
      u.full_name,
      u.matric_number,
      d.name                                                  AS dept,
      u.level,
      COUNT(DISTINCT es.id)::int                              AS exams_taken,
      ROUND(AVG(er.percentage)::numeric, 1)                   AS avg_score,
      ROUND(MAX(er.percentage)::numeric, 1)                   AS highest,
      ROUND(MIN(er.percentage)::numeric, 1)                   AS lowest,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int       AS passed,
      COUNT(v.id)::int                                        AS violations
    FROM users u
    LEFT JOIN departments   d  ON d.id             = u.department_id
    LEFT JOIN exam_sessions es ON es.student_id    = u.id
    LEFT JOIN exam_results  er ON er.session_id    = es.id
    LEFT JOIN violations    v  ON v.session_id     = es.id
    WHERE ${where}
    GROUP BY u.id, u.full_name, u.matric_number, u.level, d.name
    ORDER BY avg_score DESC NULLS LAST
    LIMIT 100
  `;

  const rows = await sql(query, params);

  const students = rows.map(s => {
    const avgScore   = parseFloat(s.avg_score as string)  || 0;
    const examsTaken = (s.exams_taken as number) || 0;
    const passed     = (s.passed     as number)  || 0;

    return {
      id:          s.id          as string,
      name:        s.full_name   as string,
      matric:      (s.matric_number as string | null) ?? '—',
      dept:        (s.dept          as string | null) ?? '—',
      level:       (s.level         as number | null) ?? 0,
      examsTaken,
      avgScore:    parseFloat(avgScore.toFixed(1)),
      highest:     parseFloat(s.highest as string) || 0,
      lowest:      parseFloat(s.lowest  as string) || 0,
      passRate:    examsTaken > 0
                     ? parseFloat(((passed / examsTaken) * 100).toFixed(1))
                     : 0,
      violations:  (s.violations as number) || 0,
      trend:       avgScore >= 60 ? 'up' : 'down',
    };
  });

  return { students };
};