// src/routes/api/exam/[examId]/start/+server.ts
import { error, json, type Cookies } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getExamForSession, getQuestionsByExam, isStudentEligible } from '$lib/server/db/exams.js';
import { getOrCreateSession, getSessionAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { computeDeadline, secondsRemaining, finalizeSession, UUID_RE } from '$lib/server/exam/session-engine.js';
import { toClientExam, toClientSession, toClientQuestions, toSavedAnswers } from '$lib/server/exam/transform.js';
import type { ExamPayload } from '$lib/types/exam.js';

const FACE_REVALIDATION_MS = 5 * 60 * 1000;

function hasFreshFaceVerification(cookies: Cookies): boolean {
  const verified = cookies.get('face_verified');
  const verifiedAt = cookies.get('face_verified_at');
  return verified === 'true' && !!verifiedAt && Date.now() - parseInt(verifiedAt, 10) < FACE_REVALIDATION_MS;
}

export const POST: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not authenticated');
  if (user.role !== 'student') throw error(403, 'Only students can take exams');
  if (user.isSuspended) throw error(403, 'Your account is suspended. Contact the exams office.');

  const { examId } = event.params;
  if (!UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  if (!hasFreshFaceVerification(event.cookies)) {
    throw error(403, 'Face verification required before starting the exam.');
  }

  const prisma = await getPrismaClient();
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Registration check ───────────────────────────────────────────────────
  const registered = await prisma.courseRegistration.findFirst({
    where: { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) throw error(403, 'You are not registered for this course.');

  // ── Eligibility (level / department restrictions) ──────────────────────
  const eligibility = isStudentEligible(exam, user);
  if (!eligibility.eligible) throw error(403, eligibility.reason ?? 'Not eligible for this exam.');

  const now = new Date();

  let session = await getOrCreateSession(
    examId,
    user.id,
    event.getClientAddress(),
    event.request.headers.get('user-agent') ?? undefined
  );

  // ── Already finished ─────────────────────────────────────────────────────
  if (session.status === 'submitted' || session.status === 'force_submitted') {
    throw error(409, 'You have already submitted this exam.');
  }

  // ── Paused for review ────────────────────────────────────────────────────
  if (session.status === 'flagged') {
    throw error(423, 'Your exam session is paused pending invigilator review.');
  }

  // ── First entry: exam must be active, and within the late-entry window ──
  if (session.status === 'not_started') {
    if (exam.status !== 'active') {
      throw error(403, `This exam is not currently active (status: ${exam.status}).`);
    }

    if (exam.scheduledStart) {
      const lateMinutes = exam.allowLateEntry ? exam.lateEntryMinutes : 0;
      const lateDeadline = new Date(exam.scheduledStart.getTime() + lateMinutes * 60_000);
      if (now > lateDeadline) {
        throw error(403, 'The entry window for this exam has closed.');
      }
    }

    session = await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'in_progress', startedAt: now },
    });
  }

  if (!session.startedAt) throw error(500, 'Session is in progress but has no start time.');

  // ── Violation-limit safety net ───────────────────────────────────────────
  if (session.violationCount >= exam.maxViolations) {
    await finalizeSession(session.id, 'force_submitted');
    throw error(403, 'This exam was auto-submitted due to repeated violations.');
  }

  // ── Time check: did the deadline pass while the student was away? ───────
  const deadline = computeDeadline(exam, session.startedAt);
  const remaining = secondsRemaining(deadline, now);

  if (remaining <= 0) {
    await finalizeSession(session.id, 'force_submitted');
    throw error(410, 'Time is up. This exam has been submitted automatically.');
  }

  // ── Build / restore the student's locked question set ───────────────────
  const allQuestions = await getQuestionsByExam(examId);
  const ordered = await buildStudentQuestionOrder(
    session.id,
    allQuestions,
    exam.randomizeQuestions,
    exam.randomizeOptions,
    exam.questionsToPresent
  );

  const safeQuestions = sanitizeQuestionsForClient(ordered);
  const savedAnswers = await getSessionAnswers(session.id);

  const payload: ExamPayload & { server_time: Date } = {
    exam: toClientExam(exam),
    session: toClientSession(session, remaining),
    questions: toClientQuestions(safeQuestions),
    savedAnswers: toSavedAnswers(savedAnswers),
    serverTime: now,
  };

  return json(payload);
};