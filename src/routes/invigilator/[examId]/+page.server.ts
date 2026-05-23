// src/routes/(invigilator)/monitor/[examId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { getExamWithCourse } from '$lib/server/db/exams.js';
import { getLiveSessionsForExam } from '$lib/server/db/sessions.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  requireInvigilatorOrAdmin(locals.user);

  const exam = await getExamWithCourse(params.examId);
  if (!exam) error(404, 'Exam not found');

  const sessions = await getLiveSessionsForExam(params.examId);

  return { exam, sessions };
};