// src/routes/api/exam/[examId]/start/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startSession } from '$lib/server/db/sessions.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const { session_id } = await request.json();

  const session = await startSession(session_id);
  broadcastStudentStatus(session.examId, session_id, 'in_progress');

  return json({ ok: true });
};