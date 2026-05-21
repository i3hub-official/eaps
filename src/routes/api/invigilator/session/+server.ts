// src/routes/api/invigilator/session/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pauseSession, resumeSession, forceSubmitSession } from '$lib/server/db/sessions.js';
import { gradeSession } from '$lib/server/db/results.js';
import { logViolation } from '$lib/server/db/violations.js';
import { broadcastStudentStatus } from '$lib/server/ws/server.js';
import { getSessionById } from '$lib/server/db/sessions.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  if (!['invigilator', 'admin'].includes(locals.user.role)) error(403, 'Forbidden');

  const { action, session_id, note } = await request.json();

  const session = await getSessionById(session_id);
  if (!session) error(404, 'Session not found');

  switch (action) {
    case 'pause':
      await pauseSession(session_id);
      await logViolation(session_id, 'invigilator_manual', 'exam_paused', note ?? 'Paused by invigilator');
      broadcastStudentStatus(session.exam_id, session_id, 'flagged');
      break;

    case 'resume':
      await resumeSession(session_id);
      broadcastStudentStatus(session.exam_id, session_id, 'in_progress');
      break;

    case 'force_submit':
      await forceSubmitSession(session_id);
      await gradeSession(session_id);
      await logViolation(session_id, 'invigilator_manual', 'auto_submitted', note ?? 'Force submitted by invigilator');
      broadcastStudentStatus(session.exam_id, session_id, 'force_submitted');
      break;

    default:
      error(400, 'Invalid action');
  }

  return json({ ok: true });
};
