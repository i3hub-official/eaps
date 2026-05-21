// src/routes/api/lecturer/questions/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createQuestion, deleteQuestion } from '$lib/server/db/exams.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  if (!['lecturer', 'admin'].includes(locals.user.role)) error(403, 'Forbidden');

  const body = await request.json();
  if (!body.exam_id || !body.type || !body.body) error(400, 'Missing fields');

  const question = await createQuestion({
    exam_id: body.exam_id,
    type: body.type,
    body: body.body,
    marks: Number(body.marks) || 1,
    order_index: Number(body.order_index) || 0,
    options: body.options,
    fitb_answers: body.fitb_answers,
  });

  return json(question);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  const id = url.searchParams.get('id');
  if (!id) error(400, 'Missing question id');
  await deleteQuestion(id);
  return json({ ok: true });
};
