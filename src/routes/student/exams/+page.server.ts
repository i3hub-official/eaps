// src/routes/student/exam/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getExamForSession, isStudentEligible } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent, getSessionAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { computeDeadline, secondsRemaining, UUID_RE } from '$lib/server/exam/session-engine.js';
import { toClientExam, toClientSession, toClientQuestions, toSavedAnswers } from '$lib/server/exam/transform.js';

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

  // If no examId, return early with a flag so the UI can show "Select an Exam"
  if (!examId || !UUID_RE.test(examId)) {
    return {
      examId: null,
      exam: null,
      student: null,
      faceEnrolled: false,
      faceVerified: false,
      faceDescriptor: null,
      sessionStatus: 'no_exam_selected',
      session: null,
      questions: [],
      savedAnswers: [],
      timeRemaining: 0,
    };
  }

  const prisma = await getPrismaClient();

  // ── Face enrollment check ──────────────────────────────────────────────
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
    select: { descriptor: true, embedding_dimension: true, enrolledAt: true },
  });

  const faceEnrolled  = !!faceDescriptor;
  const faceVerified  = hasFreshFaceVerification(cookies);

  // ── Load exam ──────────────────────────────────────────────────────────
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Registration check ─────────────────────────────────────────────────
  const registered = await prisma.courseRegistration.findFirst({
    where: { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) throw error(403, 'You are not registered for this course.');

  // ── Eligibility ────────────────────────────────────────────────────────
  const eligibility = isStudentEligible(exam, user);
  if (!eligibility.eligible) throw error(403, eligibility.reason ?? 'Not eligible.');

  // ── Student info for preview ───────────────────────────────────────────
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id:          true,
      fullName:    true,
      email:       true,
      matricNumber:true,
      photoUrl:    true,
      department: { select: { name: true, college: { select: { name: true } } } },
      level:       { select: { level: true } },
      programme:   { select: { name: true } },
    },
  });

  if (!student) throw error(404, 'Student record not found');

  // ── Existing session ───────────────────────────────────────────────────
  const existingSession = await getSessionByExamAndStudent(examId, user.id);

  let sessionData = null;
  let questionsData: ReturnType<typeof toClientQuestions> = [];
  let savedAnswersData: ReturnType<typeof toSavedAnswers> = [];
  let timeRemaining = exam.durationMinutes * 60;
  let sessionStatus = existingSession?.status ?? 'not_started';

  if (existingSession && existingSession.startedAt) {
    const deadline  = computeDeadline(exam, existingSession.startedAt);
    const remaining = secondsRemaining(deadline);

    if (remaining <= 0 && existingSession.status === 'in_progress') {
      const { finalizeSession } = await import('$lib/server/exam/session-engine.js');
      await finalizeSession(existingSession.id, 'force_submitted');
      sessionStatus = 'force_submitted';
    } else {
      timeRemaining = Math.max(0, remaining);
    }

    if (
      existingSession.status === 'in_progress' ||
      existingSession.status === 'not_started'
    ) {
      const { getQuestionsByExam } = await import('$lib/server/db/exams.js');
      const allQuestions = await getQuestionsByExam(examId);
      const ordered = await buildStudentQuestionOrder(
        existingSession.id,
        allQuestions,
        exam.randomizeQuestions,
        exam.randomizeOptions,
        exam.questionsToPresent,
      );
      const safe   = sanitizeQuestionsForClient(ordered);
      const answers = await getSessionAnswers(existingSession.id);

      sessionData      = toClientSession(existingSession, timeRemaining);
      questionsData    = toClientQuestions(safe);
      savedAnswersData = toSavedAnswers(answers);
    }
  }

  return {
    examId,
    exam:         toClientExam(exam),
    student: {
      id:          student.id,
      name:        student.fullName,
      email:       student.email,
      matricNumber:student.matricNumber,
      photoUrl:    student.photoUrl,
      department:  student.department?.name ?? null,
      college:     student.department?.college?.name ?? null,
      level:       student.level?.level ? `${student.level.level} Level` : null,
      programme:   student.programme?.name ?? null,
    },
    faceEnrolled,
    faceVerified,
    faceDescriptor: faceDescriptor ? (faceDescriptor.descriptor as number[]) : null,
    sessionStatus,
    session:      sessionData,
    questions:    questionsData,
    savedAnswers: savedAnswersData,
    timeRemaining,
  };
};