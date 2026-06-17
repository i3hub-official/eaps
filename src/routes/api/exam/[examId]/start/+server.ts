/**
 * src/routes/api/exam/[examId]/start/+server.ts
 *
 * POST  — start or resume an exam session.
 *
 * Returns session metadata ONLY — no question content.
 * Questions are fetched one at a time via GET /api/exam/[examId]/question?index=N
 *
 * Response shape:
 * {
 *   sessionId: string
 *   totalQuestions: number
 *   currentIndex: number        ← last answered + 1, or 0 for new sessions
 *   timeRemaining: number       ← seconds
 *   serverAnswers: Record<number, string>   ← index → optionId/text (for local merge)
 * }
 */

import { json, error }                      from '@sveltejs/kit';
import type { RequestHandler }              from './$types';
import { requireStudent }                   from '$lib/server/auth/guards.js';
import { getPrismaClient }                  from '$lib/server/db/index.js';
import { getExamForSession }                from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent }       from '$lib/server/db/sessions.js';
import { computeDeadline, secondsRemaining, UUID_RE, finalizeSession } from '$lib/server/exam/session-engine.js';
import { buildStudentQuestionOrder }        from '$lib/server/exam/randomizer.js';

// Face verification cookie must be fresh (5 min)
const FACE_REVALIDATION_MS = 5 * 60 * 1000;

function hasFreshFaceVerification(cookies: import('@sveltejs/kit').Cookies): boolean {
  const verified   = cookies.get('face_verified');
  const verifiedAt = cookies.get('face_verified_at');
  return (
    verified === 'true' &&
    !!verifiedAt &&
    Date.now() - parseInt(verifiedAt, 10) < FACE_REVALIDATION_MS
  );
}

export const POST: RequestHandler = async ({ params, locals, cookies }) => {
  const user   = await requireStudent(locals.user);
  const examId = params.examId;

  if (!examId || !UUID_RE.test(examId)) {
    throw error(400, 'Invalid exam ID');
  }

  if (!hasFreshFaceVerification(cookies)) {
    throw error(401, 'Face verification required');
  }

  const prisma = await getPrismaClient();

  // ── Load exam ──────────────────────────────────────────────────────────────
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  if (exam.status !== 'active' && exam.status !== 'scheduled') {
    throw error(403, 'Exam is not currently accepting submissions');
  }

  // ── Registration check ─────────────────────────────────────────────────────
  const registered = await prisma.courseRegistration.findFirst({
    where: { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) throw error(403, 'Not registered for this course');

  // ── Existing session ───────────────────────────────────────────────────────
  let session = await getSessionByExamAndStudent(examId, user.id);

  if (session) {
    if (session.status === 'submitted' || session.status === 'force_submitted') {
      return json({ error: 'already_submitted' }, { status: 409 });
    }
    if (session.status === 'flagged') {
      return json({ error: 'session_flagged' }, { status: 423 });
    }

    // Check time — auto-finalize if expired
    if (session.startedAt) {
      const deadline   = computeDeadline(exam, session.startedAt);
      const remaining  = secondsRemaining(deadline);
      if (remaining <= 0 && session.status === 'in_progress') {
        await finalizeSession(session.id, 'force_submitted');
        return json({ error: 'already_submitted' }, { status: 409 });
      }
    }
  } else {
    // ── Create new session ─────────────────────────────────────────────────
    // Validate exam is active before allowing start
    if (exam.status !== 'active') {
      throw error(403, 'Exam has not started yet');
    }

    session = await prisma.examSession.create({
      data: {
        examId,
        studentId: user.id,
        status:    'in_progress',
        startedAt: new Date(),
        ipAddress: locals.ip ?? null,
        deviceInfo: locals.userAgent ?? null,
      },
    });
  }

  // Mark in_progress if resuming a not_started session
  if (session.status === 'not_started') {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
    session = { ...session, status: 'in_progress', startedAt: new Date() };
  }

  // ── Compute time remaining ─────────────────────────────────────────────────
  const deadline      = computeDeadline(exam, session.startedAt!);
  const timeRemaining = Math.max(0, secondsRemaining(deadline));

  // ── Build / fetch question order (only indices + total — no content) ───────
  // We call buildStudentQuestionOrder to ensure the per-session order rows exist,
  // but we only return counts/indices to the client.
  const { getQuestionsByExam } = await import('$lib/server/db/exams.js');
  const allQuestions  = await getQuestionsByExam(examId);

  await buildStudentQuestionOrder(
    session.id,
    allQuestions,
    exam.randomizeQuestions,
    exam.randomizeOptions,
    exam.questionsToPresent,
  );

  const totalQuestions = exam.questionsToPresent > 0
    ? Math.min(exam.questionsToPresent, allQuestions.length)
    : allQuestions.length;

  // ── Fetch server-confirmed answers (for local store merge on resume) ────────
  const savedAnswers = await prisma.studentAnswer.findMany({
    where:  { sessionId: session.id },
    select: { question: { select: { orderIndex: true } }, selectedOption: true, textAnswer: true },
  });

  // Map question display-index → answer value
  const sessionQuestionOrder = await prisma.sessionQuestionOrder.findMany({
    where:  { sessionId: session.id },
    select: { questionId: true, displayIndex: true },
    orderBy: { displayIndex: 'asc' },
  });

  const questionIndexMap = new Map(sessionQuestionOrder.map(r => [r.questionId, r.displayIndex]));

  const serverAnswers: Record<number, string> = {};
  for (const ans of savedAnswers) {
    // find the display index for this answer's questionId
    const savedAnswer = await prisma.studentAnswer.findFirst({
      where:  { sessionId: session.id, selectedOption: ans.selectedOption ?? undefined },
      select: { questionId: true, selectedOption: true, textAnswer: true },
    });
    if (!savedAnswer) continue;
    const displayIdx = questionIndexMap.get(savedAnswer.questionId);
    if (displayIdx == null) continue;
    serverAnswers[displayIdx] = savedAnswer.selectedOption ?? savedAnswer.textAnswer ?? '';
  }

  // Derive currentIndex: first unanswered question
  const answeredIndices = new Set(Object.keys(serverAnswers).map(Number));
  let currentIndex = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (!answeredIndices.has(i)) { currentIndex = i; break; }
    if (i === totalQuestions - 1) currentIndex = totalQuestions - 1; // all answered
  }

  return json({
    sessionId:      session.id,
    totalQuestions,
    currentIndex,
    timeRemaining,
    serverAnswers,
  });
};