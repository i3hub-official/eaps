// src/routes/api/lecturer/questions/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamById } from '$lib/server/db/exams.js';
import { updateQuestion, replaceOptions } from '$lib/server/db/questions.js';
import { requireOwnership } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

// PATCH — update question body/marks or replace options
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const user = requireLecturer(locals.user);
  const { questionId, body, marks, options } = await request.json();
  if (!questionId) error(400, 'questionId required');

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) error(404, 'Question not found');

  const exam = await getExamById(question.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  if (body !== undefined || marks !== undefined) {
    await updateQuestion(questionId, { body, marks });
  }

  if (options) {
    await replaceOptions(questionId, options);
  }

  return json({ ok: true });
};