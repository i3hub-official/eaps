// src/lib/server/exam/session-engine.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { getExamForSession, isStudentEligible } from '$lib/server/db/exams.js';
import { getOrCreateSession } from '$lib/server/db/sessions.js';
import type { Exam, ExamSession } from '@prisma/client';

const MS_PER_SEC = 1000;
const FACE_REVALIDATION_MS = 5 * 60 * 1000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Timing ─────────────────────────────────────────────────────────────────

/** Absolute wall-clock deadline for a session, given exam config + when it started. */
export function computeDeadline(exam: Exam, startedAt: Date): Date {
  const byDuration = new Date(startedAt.getTime() + exam.durationMinutes * 60 * MS_PER_SEC);
  if (exam.scheduledEnd && exam.scheduledEnd < byDuration) {
    return exam.scheduledEnd;
  }
  return byDuration;
}

export function secondsRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / MS_PER_SEC));
}

/** Letter grade from a 0-100 percentage, Nigerian university scale. */
export function gradeFromPercentage(pct: number): string {
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 45) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

// ─── Face verification cookie check ───────────────────────────────────────────

export function hasFreshFaceVerification(cookies: { get(name: string): string | undefined }): boolean {
  const verified = cookies.get('face_verified');
  const verifiedAt = cookies.get('face_verified_at');
  return verified === 'true' && !!verifiedAt && Date.now() - parseInt(verifiedAt, 10) < FACE_REVALIDATION_MS;
}

// ─── Access resolution ─────────────────────────────────────────────────────────

export interface AuthedExamUser {
  id: string;
  role: string;
  isSuspended: boolean;
  level: { level: number } | null;
  department: { name: string } | null;
}

export interface SessionAccessEvent {
  locals: { user: AuthedExamUser | null };
  cookies: { get(name: string): string | undefined };
  request: { headers: Headers };
  getClientAddress(): string;
}

export type AccessDenialReason =
  | 'unauthenticated'
  | 'forbidden_role'
  | 'suspended'
  | 'invalid_exam_id'
  | 'not_found'
  | 'face_not_verified'
  | 'not_registered'
  | 'not_eligible'
  | 'not_active'
  | 'late_entry_closed'
  | 'already_submitted'
  | 'flagged'
  | 'violation_limit'
  | 'time_up';

type ExamForSession = NonNullable<Awaited<ReturnType<typeof getExamForSession>>>;

export type ExamAccess =
  | { ok: true; exam: ExamForSession; session: ExamSession; remaining: number; serverTime: Date }
  | { ok: false; reason: AccessDenialReason; message: string; status: number };

/**
 * Single source of truth for "can this student access this exam right now,
 * and what state is their session in". Handles eligibility, scheduling
 * windows, resume, violation limits, and deadline-based auto-finalization.
 *
 * Callers branch on `ok`:
 *  - API routes: `if (!access.ok) throw error(access.status, access.message)`
 *  - page loads: map `access.reason` to a redirect for better UX
 */
export async function resolveExamSession(
  event: SessionAccessEvent,
  examId: string
): Promise<ExamAccess> {
  const user = event.locals.user;
  if (!user) return { ok: false, reason: 'unauthenticated', message: 'Not authenticated', status: 401 };
  if (user.role !== 'student') {
    return { ok: false, reason: 'forbidden_role', message: 'Only students can take exams', status: 403 };
  }
  if (user.isSuspended) {
    return { ok: false, reason: 'suspended', message: 'Your account is suspended. Contact the exams office.', status: 403 };
  }

  if (!UUID_RE.test(examId)) {
    return { ok: false, reason: 'invalid_exam_id', message: 'Invalid exam id', status: 400 };
  }

  if (!hasFreshFaceVerification(event.cookies)) {
    return { ok: false, reason: 'face_not_verified', message: 'Face verification required before starting the exam.', status: 403 };
  }

  const prisma = await getPrismaClient();
  const exam = await getExamForSession(examId);
  if (!exam) return { ok: false, reason: 'not_found', message: 'Exam not found', status: 404 };

  const registered = await prisma.courseRegistration.findFirst({
    where: { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) {
    return { ok: false, reason: 'not_registered', message: 'You are not registered for this course.', status: 403 };
  }

  const eligibility = isStudentEligible(exam, user);
  if (!eligibility.eligible) {
    return { ok: false, reason: 'not_eligible', message: eligibility.reason ?? 'Not eligible for this exam.', status: 403 };
  }

  const now = new Date();

  let session = await getOrCreateSession(
    examId,
    user.id,
    event.getClientAddress(),
    event.request.headers.get('user-agent') ?? undefined
  );

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    return { ok: false, reason: 'already_submitted', message: 'You have already submitted this exam.', status: 409 };
  }

  if (session.status === 'flagged') {
    return { ok: false, reason: 'flagged', message: 'Your exam session is paused pending invigilator review.', status: 423 };
  }

  if (session.status === 'not_started') {
    if (exam.status !== 'active') {
      return { ok: false, reason: 'not_active', message: `This exam is not currently active (status: ${exam.status}).`, status: 403 };
    }

    if (exam.scheduledStart) {
      const lateMinutes = exam.allowLateEntry ? exam.lateEntryMinutes : 0;
      const lateDeadline = new Date(exam.scheduledStart.getTime() + lateMinutes * 60_000);
      if (now > lateDeadline) {
        return { ok: false, reason: 'late_entry_closed', message: 'The entry window for this exam has closed.', status: 403 };
      }
    }

    session = await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'in_progress', startedAt: now },
    });
  }

  const startedAt = session.startedAt;
  if (!startedAt) {
    return { ok: false, reason: 'not_active', message: 'Session is in progress but has no start time.', status: 500 };
  }

  if (session.violationCount >= exam.maxViolations) {
    await finalizeSession(session.id, 'force_submitted');
    return { ok: false, reason: 'violation_limit', message: 'This exam was auto-submitted due to repeated violations.', status: 403 };
  }

  const deadline = computeDeadline(exam, startedAt);
  const remaining = secondsRemaining(deadline, now);

  if (remaining <= 0) {
    await finalizeSession(session.id, 'force_submitted');
    return { ok: false, reason: 'time_up', message: 'Time is up. This exam has been submitted automatically.', status: 410 };
  }

  return { ok: true, exam, session, remaining, serverTime: now };
}

// ─── Grading / finalization ────────────────────────────────────────────────────

/**
 * Grades a session against its locked question set, writes per-answer
 * correctness/marks, upserts ExamResult, and marks the session as
 * submitted/force_submitted. Idempotent — safe to call more than once.
 */
export async function finalizeSession(
  sessionId: string,
  status: 'submitted' | 'force_submitted'
) {
  const prisma = await getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const session = await tx.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');

    if (session.status === 'submitted' || session.status === 'force_submitted') {
      const existing = await tx.examResult.findUnique({ where: { sessionId } });
      if (existing) return { session, result: existing };
    }

    const exam = await tx.exam.findUniqueOrThrow({ where: { id: session.examId } });

    const order = await tx.sessionQuestionOrder.findMany({
      where: { sessionId },
      orderBy: { displayIndex: 'asc' },
    });
    const questionIds = order.map((o) => o.questionId);

    const questions = await tx.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: true, fitbAnswers: true },
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const answers = await tx.studentAnswer.findMany({ where: { sessionId } });

    let rawScore = 0;
    let maxPossible = 0;
    let correct = 0;
    let answered = 0;

    for (const qId of questionIds) {
      const q = questionMap.get(qId);
      if (!q) continue;
      maxPossible += q.marks;

      const ans = answers.find((a) => a.questionId === qId);
      const isBlank =
        !ans ||
        (ans.selectedOption == null && (ans.textAnswer == null || ans.textAnswer.trim() === ''));
      if (isBlank) continue;

      answered += 1;

      let isCorrect = false;
      if (q.type === 'mcq') {
        const correctOpt = q.options.find((o) => o.isCorrect);
        isCorrect = !!correctOpt && ans!.selectedOption === correctOpt.id;
      } else {
        const given = (ans!.textAnswer ?? '').trim().toLowerCase();
        isCorrect = q.fitbAnswers.some((f) => f.acceptedAnswer.trim().toLowerCase() === given);
      }

      const marksEarned = isCorrect ? q.marks : 0;
      if (isCorrect) correct += 1;
      rawScore += marksEarned;

      await tx.studentAnswer.update({
        where: { id: ans!.id },
        data: { isCorrect, marksEarned },
      });
    }

    const percentage = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;
    const scaledScore = (percentage / 100) * exam.totalMarks;
    const passed = scaledScore >= exam.passMark;
    const grade = gradeFromPercentage(percentage);
    const submittedAt = new Date();
    const timeTakenSecs = session.startedAt
      ? Math.max(0, Math.floor((submittedAt.getTime() - session.startedAt.getTime()) / 1000))
      : null;

    const result = await tx.examResult.upsert({
      where: { sessionId },
      create: {
        sessionId,
        studentId: session.studentId,
        examId: session.examId,
        totalQuestions: questionIds.length,
        answered,
        correct,
        score: scaledScore,
        percentage,
        passed,
        grade,
        violationCount: session.violationCount,
        timeTakenSecs,
        submittedAt,
      },
      update: {
        totalQuestions: questionIds.length,
        answered,
        correct,
        score: scaledScore,
        percentage,
        passed,
        grade,
        violationCount: session.violationCount,
        timeTakenSecs,
        submittedAt,
      },
    });

    const updatedSession = await tx.examSession.update({
      where: { id: sessionId },
      data: { status, submittedAt, score: scaledScore, isGraded: true, timeRemainingSecs: 0 },
    });

    return { session: updatedSession, result };
  });
}