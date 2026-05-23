// src/lib/server/db/results.ts
import { prisma, sql } from './index.js';
import type { ExamResult } from '@prisma/client';

export type { ExamResult };

// ─── Prisma: simple reads ─────────────────────────────────────────────────────

export async function getResultBySession(sessionId: string) {
  return prisma.examResult.findUnique({ where: { sessionId } });
}

export async function getResultsForExam(examId: string) {
  return prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          fullName: true,
          matricNumber: true,
          department: { select: { name: true } },
        },
      },
      exam: { include: { course: { select: { code: true } } } },
    },
    orderBy: { percentage: 'desc' },
  });
}

export async function getStudentResults(studentId: string) {
  return prisma.examResult.findMany({
    where: { studentId },
    include: {
      exam: { include: { course: { select: { code: true, title: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });
}

// ─── Raw SQL: calls DB function + analytics ───────────────────────────────────

/** Grade a session — marks answers then calls compute_exam_result() */
export async function gradeSession(sessionId: string): Promise<void> {
  // Grade MCQ answers
  await sql(
    `UPDATE student_answers sa
     SET
       is_correct   = (qo.is_correct = true),
       marks_earned = CASE WHEN qo.is_correct = true THEN q.marks ELSE 0 END
     FROM question_options qo
     JOIN questions q ON q.id = sa.question_id
     WHERE sa.session_id   = $1
       AND sa.selected_option = qo.id
       AND q.type           = 'mcq'`,
    [sessionId]
  );

  // Grade FITB answers (case-insensitive match)
  await sql(
    `UPDATE student_answers sa
     SET
       is_correct   = EXISTS (
         SELECT 1 FROM fitb_answers fa
         WHERE fa.question_id = sa.question_id
           AND LOWER(TRIM(fa.accepted_answer)) = LOWER(TRIM(sa.text_answer))
       ),
       marks_earned = CASE
         WHEN EXISTS (
           SELECT 1 FROM fitb_answers fa
           WHERE fa.question_id = sa.question_id
             AND LOWER(TRIM(fa.accepted_answer)) = LOWER(TRIM(sa.text_answer))
         ) THEN q.marks ELSE 0
       END
     FROM questions q
     WHERE sa.session_id  = $1
       AND sa.question_id = q.id
       AND q.type         = 'fill_in_the_blank'`,
    [sessionId]
  );

  // Compute and persist the result row
  await sql(`SELECT compute_exam_result($1)`, [sessionId]);
}

/** Alias kept for compatibility */
export const computeResult = gradeSession;

export interface ExamStats {
  total_students: number; submitted: number; passed: number;
  pass_rate: number; avg_score: number; avg_percentage: number;
  highest: number; lowest: number;
}

export async function getExamStats(examId: string): Promise<ExamStats | null> {
  const rows = await sql<ExamStats>(
    `SELECT
       COUNT(*)::int AS total_students,
       COUNT(*) FILTER (WHERE submitted_at IS NOT NULL)::int AS submitted,
       COUNT(*) FILTER (WHERE passed = true)::int AS passed,
       ROUND(COUNT(*) FILTER (WHERE passed = true)::numeric / NULLIF(COUNT(*),0) * 100, 2) AS pass_rate,
       ROUND(AVG(score)::numeric, 2)      AS avg_score,
       ROUND(AVG(percentage)::numeric, 2) AS avg_percentage,
       MAX(percentage) AS highest,
       MIN(percentage) AS lowest
     FROM exam_results WHERE exam_id = $1`,
    [examId]
  );
  return rows[0] ?? null;
}

export async function getGradeDistribution(examId: string) {
  return sql<{ grade: string; count: number }>(
    `SELECT grade, COUNT(*)::int AS count
     FROM exam_results WHERE exam_id = $1
     GROUP BY grade ORDER BY grade`,
    [examId]
  );
}