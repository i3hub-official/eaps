// src/routes/lecturer/exams/[examId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  // Check if this is a valid UUID - if not, redirect
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(examId)) {
    throw error(404, 'Exam not found');
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      levels: true,
      examDepartments: {
        include: {
          department: true
        }
      },
      _count: {
        select: {
          questions: true,
          examSessions: true
        }
      }
    }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  // Get session stats
  const stats = await sql<{
    total: number;
    submitted: number;
    in_progress: number;
    not_started: number;
    avg_score: number;
    pass_count: number;
    fail_count: number;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'not_started')::int AS not_started,
       COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS avg_score,
       COUNT(*) FILTER (WHERE er.percentage >= $2::int)::int AS pass_count,
       COUNT(*) FILTER (WHERE er.percentage < $2::int AND er.percentage > 0)::int AS fail_count
     FROM exam_sessions es
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = $1::uuid`,
    [examId, exam.passMark]
  );

  // Get recent submissions
  const recentSubmissions = await sql<{
    id: string;
    studentName: string;
    studentEmail: string;
    submittedAt: Date;
    score: number;
    status: string;
  }>(
    `SELECT
       es.id,
       u.full_name AS "studentName",
       u.email AS "studentEmail",
       es.submitted_at AS "submittedAt",
       er.percentage AS score,
       es.status
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     LEFT JOIN exam_results er ON er.session_id = es.id
     WHERE es.exam_id = $1::uuid
       AND es.status IN ('submitted', 'force_submitted')
     ORDER BY es.submitted_at DESC
     LIMIT 10`,
    [examId]
  );

  // Get violation stats
  const violationStats = await sql<{
    total_violations: number;
    students_with_violations: number;
  }>(
    `SELECT
       COUNT(*)::int AS total_violations,
       COUNT(DISTINCT session_id)::int AS students_with_violations
     FROM violations
     WHERE session_id IN (
       SELECT id FROM exam_sessions WHERE exam_id = $1::uuid
     )`,
    [examId]
  );

  // Get departments for this exam
  const departments = await prisma.examDepartment.findMany({
    where: { examId: exam.id },
    include: {
      department: true
    }
  });

  return {
    exam: {
      ...exam,
      departments: departments.map(ed => ed.department)
    },
    stats: stats[0] || { total: 0, submitted: 0, in_progress: 0, not_started: 0, avg_score: 0, pass_count: 0, fail_count: 0 },
    recentSubmissions,
    violationStats: violationStats[0] || { total_violations: 0, students_with_violations: 0 },
    questionCount: exam._count.questions,
    sessionCount: exam._count.examSessions,
  };
};