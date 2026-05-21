// src/routes/api/exam/[examId]/answer/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveAnswer, updateTimeRemaining } from '$lib/server/db/sessions.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const body = await request.json();

  // Time sync
  if (body.type === 'time_sync') {
    await updateTimeRemaining(body.session_id, body.remaining);
    return json({ ok: true });
  }

  // Save answer
  const { session_id, question_id, selected_option, text_answer, time_spent_secs } = body;

  if (!session_id || !question_id) error(400, 'Missing fields');

  await saveAnswer(session_id, question_id, selected_option ?? null, text_answer ?? null, time_spent_secs ?? 0);

  return json({ ok: true });
};
