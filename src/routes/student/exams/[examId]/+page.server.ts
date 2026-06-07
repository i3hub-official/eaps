// src/routes/(student)/exam/[examId]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getExamById } from '$lib/server/db/exams.js';
import { getQuestionsForExam } from '$lib/server/db/questions.js';
import { getOrCreateSession, getSavedAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import type { QuestionWithRelations } from '$lib/server/exam/randomizer.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireStudent(locals.user);
  const exam = await getExamById(params.examId);

  if (!exam) error(404, 'Exam not found');
  if (exam.status !== 'active') error(403, 'This exam is not currently active');

  const session = await getOrCreateSession(exam.id, user.id);

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    redirect(302, `/exam/${exam.id}/complete`);
  }

  const allQuestions = await getQuestionsForExam(exam.id) as QuestionWithRelations[];
  const orderedQuestions = await buildStudentQuestionOrder(
    session.id, allQuestions, exam.randomizeQuestions, exam.randomizeOptions
  );

  const safeQuestions = sanitizeQuestionsForClient(orderedQuestions);
  const savedAnswers = await getSavedAnswers(session.id);

  return { exam, session, questions: safeQuestions, savedAnswers };
};