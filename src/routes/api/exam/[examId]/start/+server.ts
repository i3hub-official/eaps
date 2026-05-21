// src/routes/api/exam/[examId]/start/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startSession } from '$lib/server/db/sessions.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const { session_id } = await request.json();
  const ip = getClientAddress();
  const ua = request.headers.get('user-agent') ?? '';

  const session = await startSession(session_id, ip, ua);
  broadcastStudentStatus(session.exam_id, session_id, 'in_progress');

  return json({ ok: true });
};
