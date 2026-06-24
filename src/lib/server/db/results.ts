// src/lib/server/db/results.ts
import { getPrismaClient, sql } from './index.js';
import type { ExamResult } from '@prisma/client';

export type { ExamResult };

// ─── Prisma: simple reads ─────────────────────────────────────────────────────

export async function getResultBySession(sessionId: string) {
  const prisma = await getPrismaClient();
  return prisma.examResult.findUnique({ where: { sessionId } });
}

export async function getResultsForExam(examId: string) {
  const prisma = await getPrismaClient();
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
  const prisma = await getPrismaClient();
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
  // Use a transaction to ensure all updates happen atomically
  
  // 1. Grade MCQ answers - Using a CTE approach
  await sql(
    `WITH mcq_updates AS (
       SELECT 
         sa.id AS answer_id,
         qo.is_correct AS is_correct,
         CASE WHEN qo.is_correct = true THEN q.marks ELSE 0 END AS marks_earned
       FROM student_answers sa
       JOIN question_options qo ON sa.selected_option = qo.id
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.session_id = $1
         AND q.type = 'mcq'
     )
     UPDATE student_answers
     SET 
       is_correct = mcq_updates.is_correct,
       marks_earned = mcq_updates.marks_earned
     FROM mcq_updates
     WHERE student_answers.id = mcq_updates.answer_id`,
    [sessionId]
  );

  // 2. Grade FITB answers - Using a CTE approach
  await sql(
    `WITH fitb_updates AS (
       SELECT 
         sa.id AS answer_id,
         EXISTS (
           SELECT 1 FROM fitb_answers fa
           WHERE fa.question_id = sa.question_id
             AND LOWER(TRIM(fa.accepted_answer)) = LOWER(TRIM(sa.text_answer))
         ) AS is_correct,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM fitb_answers fa
             WHERE fa.question_id = sa.question_id
               AND LOWER(TRIM(fa.accepted_answer)) = LOWER(TRIM(sa.text_answer))
           ) THEN q.marks 
           ELSE 0 
         END AS marks_earned
       FROM student_answers sa
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.session_id = $1
         AND q.type = 'fill_in_the_blank'
         AND sa.text_answer IS NOT NULL
         AND sa.text_answer != ''
     )
     UPDATE student_answers
     SET 
       is_correct = fitb_updates.is_correct,
       marks_earned = fitb_updates.marks_earned
     FROM fitb_updates
     WHERE student_answers.id = fitb_updates.answer_id`,
    [sessionId]
  );

  // 3. Compute and persist the result row
  await sql(`SELECT compute_exam_result($1)`, [sessionId]);
}

/** Alias kept for compatibility */
export const computeResult = gradeSession;

export interface ExamStats {
  total_students: number; 
  submitted: number; 
  passed: number;
  pass_rate: number; 
  avg_score: number; 
  avg_percentage: number;
  highest: number; 
  lowest: number;
}

export async function getExamStats(examId: string): Promise<ExamStats | null> {
  const rows = await sql<ExamStats>(
    `SELECT
       COUNT(*)::int AS total_students,
       COUNT(*) FILTER (WHERE submitted_at IS NOT NULL)::int AS submitted,
       COUNT(*) FILTER (WHERE passed = true)::int AS passed,
       ROUND(COUNT(*) FILTER (WHERE passed = true)::numeric / NULLIF(COUNT(*),0) * 100, 2) AS pass_rate,
       ROUND(COALESCE(AVG(score), 0)::numeric, 2) AS avg_score,
       ROUND(COALESCE(AVG(percentage), 0)::numeric, 2) AS avg_percentage,
       COALESCE(MAX(percentage), 0) AS highest,
       COALESCE(MIN(percentage), 0) AS lowest
     FROM exam_results 
     WHERE exam_id = $1`,
    [examId]
  );
  return rows[0] ?? null;
}

export async function getGradeDistribution(examId: string) {
  return sql<{ grade: string; count: number }>(
    `SELECT grade, COUNT(*)::int AS count
     FROM exam_results 
     WHERE exam_id = $1
       AND grade IS NOT NULL
     GROUP BY grade 
     ORDER BY grade`,
    [examId]
  );
}