// src/routes/api/exam/[examId]/submit/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitSession } from '$lib/server/db/sessions.js';
import { gradeSession } from '$lib/server/db/results.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const { session_id } = await request.json();

  const session = await submitSession(session_id);
  if (!session) return json({ ok: true }); // already submitted

  await gradeSession(session_id);
  broadcastStudentStatus(params.examId, session_id, 'submitted');

  return json({ ok: true });
};
