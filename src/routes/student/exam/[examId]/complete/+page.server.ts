// src/routes/(student)/exam/[examId]/complete/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getExamById } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent } from '$lib/server/db/sessions.js';
import { getResultBySession } from '$lib/server/db/results.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireStudent(locals.user);
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');

  const session = await getSessionByExamAndStudent(exam.id, user.id);
  if (!session) error(404, 'No session found');

  const result = await getResultBySession(session.id);
  return { exam, session, result };
};