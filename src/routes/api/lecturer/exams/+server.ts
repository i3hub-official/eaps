// src/routes/api/lecturer/exams/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamById, updateExam, setExamStatus, deleteExam } from '$lib/server/db/exams.js';
import { requireOwnership } from '$lib/server/auth/guards.js';

// PATCH — update exam settings or status
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const user = requireLecturer(locals.user);
  const body = await request.json();
  const { examId, ...updates } = body;

  if (!examId) error(400, 'examId required');

  const exam = await getExamById(examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  // Status-only update
  if (updates.status && Object.keys(updates).length === 1) {
    await setExamStatus(examId, updates.status);
    return json({ ok: true });
  }

  const updated = await updateExam(examId, updates);
  return json({ ok: true, exam: updated });
};

// DELETE — delete a draft exam
export const DELETE: RequestHandler = async ({ request, locals }) => {
  const user = requireLecturer(locals.user);
  const { examId } = await request.json();
  if (!examId) error(400, 'examId required');

  const exam = await getExamById(examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  await deleteExam(examId);
  return json({ ok: true });
};