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
      student: { select: { fullName: true, matricNumber: true, department: { select: { name: true } } } },
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

/** Trigger the Postgres compute_exam_result() function */
export async function computeResult(sessionId: string): Promise<void> {
  await sql(`SELECT compute_exam_result($1)`, [sessionId]);
}

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
       ROUND(AVG(score)::numeric, 2) AS avg_score,
       ROUND(AVG(percentage)::numeric, 2) AS avg_percentage,
       MAX(percentage) AS highest,
       MIN(percentage) AS lowest
     FROM exam_results WHERE exam_id = $1`,
    [examId]
  );
  return rows[0] ?? null;
}

export async function getGradeDistribution(examId: string) {
  const rows = await sql<{ grade: string; count: number }>(
    `SELECT grade, COUNT(*)::int AS count
     FROM exam_results WHERE exam_id = $1
     GROUP BY grade ORDER BY grade`,
    [examId]
  );
  return rows;
}

// ─── Alias ────────────────────────────────────────────────────────────────────

/** Alias: grade a session by calling the DB compute function */
export const gradeSession = computeResult;