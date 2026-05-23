// src/lib/server/db/sessions.ts

import { prisma, sql } from './index.js';
import type { ExamSession, SessionStatus, StudentAnswer } from '@prisma/client';

export type { ExamSession, SessionStatus, StudentAnswer };

// ─── Prisma: session lifecycle ────────────────────────────────────────────────

export async function getSessionById(id: string) {
  return prisma.examSession.findUnique({ where: { id } });
}

export async function getOrCreateSession(
  examId: string, studentId: string,
  ipAddress?: string, deviceInfo?: string
) {
  return prisma.examSession.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, ipAddress, deviceInfo },
    update: {},
  });
}

export async function startSession(id: string) {
  return prisma.examSession.update({
    where: { id, status: 'not_started' },
    data: { status: 'in_progress', startedAt: new Date() },
  });
}

export async function saveTimeRemaining(id: string, secs: number) {
  await prisma.examSession.update({ where: { id }, data: { timeRemainingSecs: secs } });
}

export async function submitSession(
  id: string,
  status: 'submitted' | 'force_submitted' = 'submitted'
) {
  return prisma.examSession.update({
    where: { id },
    data: { status, submittedAt: new Date() },
  });
}

export async function flagSession(id: string) {
  await prisma.examSession.update({ where: { id }, data: { status: 'flagged' } });
}

export async function resumeSession(id: string) {
  await prisma.examSession.updateMany({
    where: { id, status: 'flagged' },
    data: { status: 'in_progress' },
  });
}

export async function incrementViolation(id: string): Promise<number> {
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
  return prisma.studentAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: { sessionId, questionId, ...answer, answeredAt: new Date() },
    update: { ...answer, answeredAt: new Date() },
  });
}

export async function getSessionAnswers(sessionId: string) {
  return prisma.studentAnswer.findMany({ where: { sessionId } });
}

export async function getStudentSessions(studentId: string) {
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

// ─── Aliases + missing helpers (compatibility) ────────────────────────────────

/** Find a session by exam + student (used in complete page) */
export async function getSessionByExamAndStudent(
  examId: string,
  studentId: string
): Promise<ExamSession | null> {
  return prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId } },
  });
}

/** Alias — returns answers for a session */
export const getSavedAnswers = getSessionAnswers;

/** Alias — saves remaining time */
export const updateTimeRemaining = saveTimeRemaining;

/** Force-submit a session */
export async function forceSubmitSession(id: string) {
  return submitSession(id, 'force_submitted');
}

/** Flat saveAnswer signature used by the API route */
export async function saveAnswerFlat(
  sessionId: string,
  questionId: string,
  selectedOption: string | null,
  textAnswer: string | null,
  timeSpentSecs: number
) {
  return saveAnswer(sessionId, questionId, { selectedOption: selectedOption ?? undefined, textAnswer: textAnswer ?? undefined, timeSpentSecs });
}

/** startSession override that also records ip/ua on the session */
export async function startSessionWithMeta(
  id: string,
  _ip?: string,
  _ua?: string
) {
  // ip/ua are already captured at session creation (getOrCreateSession);
  // this just transitions the status
  return startSession(id);
}