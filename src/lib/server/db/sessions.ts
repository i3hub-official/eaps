// src/lib/server/db/sessions.ts

import { getPrismaClient, sql } from './index.js';
import type { ExamSession, StudentAnswer } from '@prisma/client';
import type { SessionStatus } from '$lib/types/exam.js';

export type { ExamSession, StudentAnswer, SessionStatus };

// ─── Prisma: session lifecycle ────────────────────────────────────────────────

export async function getSessionById(id: string) {
  const prisma = await getPrismaClient();

  return prisma.examSession.findUnique({ where: { id } });
}

export async function getOrCreateSession(
  examId: string, studentId: string,
  ipAddress?: string, deviceInfo?: string
) {
  const prisma = await getPrismaClient();

  return prisma.examSession.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, ipAddress, deviceInfo },
    update: {},
  });
}

/**
 * Starts a session, but only if it's still 'not_started'.
 * Returns null if it was already started/submitted/flagged — caller should
 * re-fetch and branch on the actual status rather than assume this ran.
 */
export async function startSession(id: string) {
  const prisma = await getPrismaClient();

  const current = await prisma.examSession.findUnique({ where: { id }, select: { status: true } });
  if (!current || current.status !== 'not_started') return null;

  return prisma.examSession.update({
    where: { id },
    data: { status: 'in_progress', startedAt: new Date() },
  });
}

export async function saveTimeRemaining(id: string, secs: number) {
  const prisma = await getPrismaClient();

  await prisma.examSession.update({ where: { id }, data: { timeRemainingSecs: secs } });
}

export async function submitSession(
  id: string,
  status: 'submitted' | 'force_submitted' = 'submitted'
) {
  const prisma = await getPrismaClient();

  return prisma.examSession.update({
    where: { id },
    data: { status, submittedAt: new Date() },
  });
}

export async function flagSession(id: string) {
  const prisma = await getPrismaClient();

  await prisma.examSession.update({ where: { id }, data: { status: 'flagged' } });
}

export async function resumeSession(id: string) {
  const prisma = await getPrismaClient();

  await prisma.examSession.updateMany({
    where: { id, status: 'flagged' },
    data: { status: 'in_progress' },
  });
}

export async function incrementViolation(id: string): Promise<number> {
  const prisma = await getPrismaClient();

  const updated = await prisma.examSession.update({
    where: { id },
    data: { violationCount: { increment: 1 } },
    select: { violationCount: true },
  });
  return updated.violationCount;
}

// ─── Prisma: randomized order ─────────────────────────────────────────────────

export async function saveSessionOrder(
  sessionId: string,
  questionOrder: { questionId: string; displayIndex: number }[],
  optionOrder: { questionId: string; optionId: string; displayIndex: number }[]
) {
  const prisma = await getPrismaClient();

  await prisma.$transaction([
    prisma.sessionQuestionOrder.createMany({
      data: questionOrder.map(q => ({ sessionId, ...q })),
      skipDuplicates: true,
    }),
    prisma.sessionOptionOrder.createMany({
      data: optionOrder.map(o => ({ sessionId, ...o })),
      skipDuplicates: true,
    }),
  ]);
}

// ─── Prisma: answers ──────────────────────────────────────────────────────────

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  answer: { selectedOption?: string; textAnswer?: string; timeSpentSecs?: number }
) {
  const prisma = await getPrismaClient();

  return prisma.studentAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: { sessionId, questionId, ...answer, answeredAt: new Date() },
    update: { ...answer, answeredAt: new Date() },
  });
}

export async function getSessionAnswers(sessionId: string) {
  const prisma = await getPrismaClient();

  return prisma.studentAnswer.findMany({ where: { sessionId } });
}

export async function getStudentSessions(studentId: string) {
  const prisma = await getPrismaClient();

  return prisma.examSession.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Raw SQL: live dashboard ──────────────────────────────────────────────────

export interface LiveSession {
  session_id: string; exam_id: string; student_id: string;
  student_name: string; matric_number: string | null;
  department: string; exam_title: string; course_code: string;
  status: SessionStatus; violation_count: number;
  started_at: Date | null; time_remaining_secs: number | null;
  total_flags: number;
}

export async function getLiveSessionsForExam(examId: string): Promise<LiveSession[]> {
  return sql<LiveSession>(
    `SELECT
       es.id AS session_id, es.exam_id, es.student_id,
       u.full_name AS student_name, u.matric_number,
       d.name AS department,
       e.title AS exam_title, c.code AS course_code,
       es.status, es.violation_count,
       es.started_at, es.time_remaining_secs,
       COUNT(v.id)::int AS total_flags
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     JOIN departments d ON d.id = u.department_id
     JOIN exams e ON e.id = es.exam_id
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN violations v ON v.session_id = es.id
     WHERE es.exam_id = $1
     GROUP BY es.id, u.full_name, u.matric_number, d.name, e.title, c.code
     ORDER BY es.violation_count DESC, u.full_name`,
    [examId]
  );
}

export async function getLiveSession(sessionId: string): Promise<LiveSession | null> {
  const rows = await sql<LiveSession>(
    `SELECT
       es.id AS session_id, es.exam_id, es.student_id,
       u.full_name AS student_name, u.matric_number,
       d.name AS department,
       e.title AS exam_title, c.code AS course_code,
       es.status, es.violation_count,
       es.started_at, es.time_remaining_secs,
       COUNT(v.id)::int AS total_flags
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     JOIN departments d ON d.id = u.department_id
     JOIN exams e ON e.id = es.exam_id
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN violations v ON v.session_id = es.id
     WHERE es.id = $1
     GROUP BY es.id, u.full_name, u.matric_number, d.name, e.title, c.code`,
    [sessionId]
  );
  return rows[0] ?? null;
}

// ─── Aliases + helpers ─────────────────────────────────────────────────────────

export async function getSessionByExamAndStudent(
  examId: string,
  studentId: string
): Promise<ExamSession | null> {
  const prisma = await getPrismaClient();

  return prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId } },
  });
}

export const getSavedAnswers = getSessionAnswers;
export const updateTimeRemaining = saveTimeRemaining;

export async function forceSubmitSession(id: string) {
  return submitSession(id, 'force_submitted');
}

export async function saveAnswerFlat(
  sessionId: string,
  questionId: string,
  selectedOption: string | null,
  textAnswer: string | null,
  timeSpentSecs: number
) {
  return saveAnswer(sessionId, questionId, {
    selectedOption: selectedOption ?? undefined,
    textAnswer: textAnswer ?? undefined,
    timeSpentSecs,
  });
}

/** startSession variant that also records ip/device on first start. */
export async function startSessionWithMeta(id: string, ip?: string, ua?: string) {
  const session = await startSession(id);
  if (!session) return null;

  if (ip || ua) {
    const prisma = await getPrismaClient();
    return prisma.examSession.update({
      where: { id },
      data: {
        ...(ip ? { ipAddress: ip } : {}),
        ...(ua ? { deviceInfo: ua } : {}),
      },
    });
  }

  return session;
}