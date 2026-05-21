// src/routes/(lecturer)/exams/[examId]/results/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExamById } from '$lib/server/db/exams.js';
import { getResultsByExam } from '$lib/server/db/results.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');
  if (exam.created_by !== locals.user!.id && locals.user!.role !== 'admin') error(403, 'Forbidden');

  const results = await getResultsByExam(exam.id);
  return { exam, results };
};
