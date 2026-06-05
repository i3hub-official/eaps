// src/routes/admin/reports/student-performance/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [students, summaryRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: string;
      full_name: string;
      matric_number: string | null;
      level_name: string | null;
      level_num: number | null;
      department: string | null;
      college: string | null;
      exams_taken: number;
      passed: number;
      avg_pct: number | null;
      last_exam: Date | null;
    }>>(`
      SELECT
        u.id,
        u.full_name,
        u.matric_number,
        l.name       AS level_name,
        l.level      AS level_num,
        d.name       AS department,
        co.name      AS college,
        COUNT(DISTINCT er.id)::int                                      AS exams_taken,
        COUNT(DISTINCT CASE WHEN er.passed = true THEN er.id END)::int  AS passed,
        ROUND(AVG(er.percentage)::numeric, 1)                           AS avg_pct,
        MAX(er.submitted_at)                                            AS last_exam
      FROM users u
      LEFT JOIN levels       l  ON u.level_id      = l.id
      LEFT JOIN departments  d  ON u.department_id = d.id
      LEFT JOIN colleges     co ON u.college_id    = co.id
      LEFT JOIN exam_results er ON er.student_id   = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, l.name, l.level, d.name, co.name
      ORDER BY avg_pct DESC NULLS LAST
      LIMIT 100
    `),

    prisma.$queryRawUnsafe<Array<{
      total_students: number;
      avg_pct: number | null;
      total_passed: number;
      total_attempts: number;
    }>>(`
      SELECT
        COUNT(DISTINCT u.id)::int                               AS total_students,
        ROUND(AVG(er.percentage)::numeric, 1)                   AS avg_pct,
        COUNT(DISTINCT CASE WHEN er.passed = true THEN er.id END)::int AS total_passed,
        COUNT(DISTINCT er.id)::int                              AS total_attempts
      FROM users u
      LEFT JOIN exam_results er ON er.student_id = u.id
      WHERE u.role = 'student'
    `),
  ]);

  return {
    students: students.map((s) => ({
      id: s.id.slice(0, 8),
      name: s.full_name,
      matric: s.matric_number || '—',
      level: s.level_name || s.level_num?.toString() || '—',
      department: s.department || '—',
      college: s.college || '—',
      examsTaken: s.exams_taken,
      passed: s.passed,
      avgPct: s.avg_pct ?? '—',
      lastExam: s.last_exam
        ? s.last_exam.toISOString().split('T')[0]
        : '—',
    })),

    summary: {
      totalStudents: summaryRows[0]?.total_students ?? 0,
      avgPct: summaryRows[0]?.avg_pct ?? '—',
      totalPassed: summaryRows[0]?.total_passed ?? 0,
      totalAttempts: summaryRows[0]?.total_attempts ?? 0,
    },
  };
};