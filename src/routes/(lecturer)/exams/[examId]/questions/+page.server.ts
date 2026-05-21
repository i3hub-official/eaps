// src/routes/(lecturer)/exams/[examId]/questions/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExamById, getQuestionsByExam } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');
  if (exam.created_by !== locals.user!.id && locals.user!.role !== 'admin') {
    error(403, 'Access denied');
  }
  const questions = await getQuestionsByExam(exam.id);
  return { exam, questions };
};
