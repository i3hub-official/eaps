// src/routes/(invigilator)/monitor/[examId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionsForExam } from '$lib/server/db/sessions.js';
import { getViolationsByExam } from '$lib/server/db/violations.js';

export const load: PageServerLoad = async ({ params }) => {
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');

  const sessions = await getSessionsForExam(exam.id);
  const violations = await getViolationsByExam(exam.id);

  return { exam, sessions, violations };
};
