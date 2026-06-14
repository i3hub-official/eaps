// src/lib/server/exam/session-engine.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import type { Exam } from '@prisma/client';

const MS_PER_SEC = 1000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Already finalized — return existing result untouched.
    if (session.status === 'submitted' || session.status === 'force_submitted') {
      const existing = await tx.examResult.findUnique({ where: { sessionId } });
      if (existing) return { session, result: existing };
    }

    const exam = await tx.exam.findUniqueOrThrow({ where: { id: session.examId } });

    // The locked, per-student question set (respects questionsToPresent).
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
      if (isBlank) continue; // unanswered — counts toward total/maxPossible only

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