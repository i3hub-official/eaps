// src/routes/(student)/exam/[examId]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExamById, getQuestionsByExam } from '$lib/server/db/exams.js';
import { getOrCreateSession, getSavedAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user!;
  const exam = await getExamById(params.examId);

  if (!exam) error(404, 'Exam not found');
  if (exam.status !== 'active') error(403, 'This exam is not currently active');

  const session = await getOrCreateSession(exam.id, user.id);

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    redirect(302, `/exam/${exam.id}/complete`);
  }

  const allQuestions = await getQuestionsByExam(exam.id);
  const orderedQuestions = await buildStudentQuestionOrder(
    session.id,
    allQuestions,
    exam.randomizeQuestions,
    exam.randomizeOptions
  );

  const safeQuestions = sanitizeQuestionsForClient(orderedQuestions);
  const savedAnswers = await getSavedAnswers(session.id);

  return {
    exam,
    session,
    questions: safeQuestions,
    savedAnswers,
  };
};
