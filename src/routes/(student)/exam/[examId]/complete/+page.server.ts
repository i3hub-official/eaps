// src/routes/(student)/exam/[examId]/complete/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent } from '$lib/server/db/sessions.js';
import { getResultBySession } from '$lib/server/db/results.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');

  const session = await getSessionByExamAndStudent(exam.id, locals.user!.id);
  if (!session) error(404, 'No session found');

  const result = true ? await getResultBySession(session.id) : null;

  return { exam, session, result };
};
