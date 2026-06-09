// src/routes/student/exams/[examId]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { requireFaceVerified } from '$lib/server/auth/face-guard.js';
import { getExamById } from '$lib/server/db/exams.js';
import { getQuestionsForExam } from '$lib/server/db/questions.js';
import { getOrCreateSession, getSavedAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import type { QuestionWithRelations } from '$lib/server/exam/randomizer.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireStudent(locals.user);
  const examId = params.examId;

  const exam = await getExamById(examId);
  if (!exam) error(404, 'Exam not found');
  if (exam.status !== 'active') error(403, 'This exam is not currently active');

  // Verify student is registered for this course — any type: normal, carry_over, borrowed
  // Department and college do not matter. Only registration record matters.
  const registered = await prisma.courseRegistration.findFirst({
    where: {
      studentId: user.id,
      courseId: exam.courseId,
      session: exam.session,
      semester: exam.semester,
    },
  });
  if (!registered) error(403, 'You are not registered for this course');

  // Face verification guard — must be verified before starting
  await requireFaceVerified(user.id, examId);

  const session = await getOrCreateSession(exam.id, user.id);

  // Already submitted? Go to completion page
  if (session.status === 'submitted' || session.status === 'force_submitted') {
    redirect(302, `/student/exams/${exam.id}/complete`);
  }

  const allQuestions = await getQuestionsForExam(exam.id) as QuestionWithRelations[];
  const orderedQuestions = await buildStudentQuestionOrder(
    session.id, allQuestions, exam.randomizeQuestions, exam.randomizeOptions
  );

  const safeQuestions = sanitizeQuestionsForClient(orderedQuestions);
  const savedAnswers = await getSavedAnswers(session.id);

  return { exam, session, questions: safeQuestions, savedAnswers };
};