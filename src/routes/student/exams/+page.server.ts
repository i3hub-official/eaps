/**
 * src/routes/student/exams/+page.server.ts
 *
 * Loads only session metadata for the exam flow.
 * Questions are NOT loaded here — they're fetched one-at-a-time via
 * GET /api/exam/[examId]/question?index=N&sessionId=<id>
 *
 * What we DO load here:
 *   - exam config (title, duration, course code, etc.)
 *   - student profile snapshot (for identity preview step)
 *   - face enrollment status
 *   - existing session status + server-confirmed answer indices (for resume)
 */

import { error, redirect }        from '@sveltejs/kit';
import type { PageServerLoad }    from './$types';
import { requireStudent }         from '$lib/server/auth/guards.js';
import { getPrismaClient }        from '$lib/server/db/index.js';
import { getExamForSession, isStudentEligible } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent }           from '$lib/server/db/sessions.js';
import { computeDeadline, secondsRemaining, UUID_RE, finalizeSession }
  from '$lib/server/exam/session-engine.js';
import { toClientExam }           from '$lib/server/exam/transform.js';

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

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const user   = await requireStudent(locals.user);
  const examId = url.searchParams.get('examId');

  if (!examId || !UUID_RE.test(examId)) {
    throw redirect(302, '/student/exams');
  }

  const prisma = await getPrismaClient();

  // ── Face enrollment check ──────────────────────────────────────────────────
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where:  { studentId: user.id },
    select: { descriptor: true, embedding_dimension: true, enrolledAt: true },
  });

  const faceEnrolled = !!faceDescriptor;
  const faceVerified = hasFreshFaceVerification(cookies);

  // ── Load exam ──────────────────────────────────────────────────────────────
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Registration check ─────────────────────────────────────────────────────
  const registered = await prisma.courseRegistration.findFirst({
    where:  { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) throw error(403, 'You are not registered for this course.');

  // ── Eligibility ────────────────────────────────────────────────────────────
  const eligibility = isStudentEligible(exam, user);
  if (!eligibility.eligible) throw error(403, eligibility.reason ?? 'Not eligible.');

  // ── Student info for preview step ─────────────────────────────────────────
  const student = await prisma.user.findUnique({
    where:  { id: user.id },
    select: {
      id:           true,
      fullName:     true,
      email:        true,
      matricNumber: true,
      photoUrl:     true,
      department: { select: { name: true, college: { select: { name: true } } } },
      level:       { select: { level: true } },
      programme:   { select: { name: true } },
    },
  });
  if (!student) throw error(404, 'Student record not found');

  // ── Existing session ───────────────────────────────────────────────────────
  const existingSession = await getSessionByExamAndStudent(examId, user.id);

  let sessionStatus    = existingSession?.status ?? 'not_started';
  let sessionId: string | null = existingSession?.id ?? null;
  let timeRemaining    = exam.durationMinutes * 60;
  // Indices the server already has answers for (0-based display index)
  let serverAnswerIndices: number[] = [];

  if (existingSession?.startedAt) {
    const deadline  = computeDeadline(exam, existingSession.startedAt);
    const remaining = secondsRemaining(deadline);

    if (remaining <= 0 && existingSession.status === 'in_progress') {
      await finalizeSession(existingSession.id, 'force_submitted');
      sessionStatus = 'force_submitted';
    } else {
      timeRemaining = Math.max(0, remaining);
    }

    if (
      existingSession.status === 'in_progress' ||
      existingSession.status === 'not_started'
    ) {
      // Fetch which question indices the server already has recorded
      const savedAnswerRows = await prisma.studentAnswer.findMany({
        where:  { sessionId: existingSession.id },
        select: { questionId: true },
      });

      if (savedAnswerRows.length > 0) {
        const savedQuestionIds = new Set(savedAnswerRows.map(r => r.questionId));
        const orderRows = await prisma.sessionQuestionOrder.findMany({
          where:  { sessionId: existingSession.id, questionId: { in: [...savedQuestionIds] } },
          select: { displayIndex: true },
        });
        serverAnswerIndices = orderRows.map(r => r.displayIndex);
      }
    }
  }

  // ── Total questions (for resume context only) ──────────────────────────────
  let totalQuestions: number | null = null;
  if (existingSession) {
    totalQuestions = await prisma.sessionQuestionOrder.count({
      where: { sessionId: existingSession.id },
    });
    // If 0, order hasn't been built yet (new session) — client will learn on start
    if (totalQuestions === 0) totalQuestions = null;
  }

  return {
    examId,
    exam:         toClientExam(exam),
    student: {
      id:           student.id,
      name:         student.fullName,
      email:        student.email,
      matricNumber: student.matricNumber,
      photoUrl:     student.photoUrl,
      department:   student.department?.name  ?? null,
      college:      student.department?.college?.name ?? null,
      level:        student.level?.level ? `${student.level.level} Level` : null,
      programme:    student.programme?.name ?? null,
    },
    faceEnrolled,
    faceVerified,
    faceDescriptor: faceEnrolled
      ? (faceDescriptor!.descriptor as number[])
      : null,
    sessionStatus,
    sessionId,
    timeRemaining,
    totalQuestions,
    serverAnswerIndices,
  };
};