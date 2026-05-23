// src/routes/api/invigilator/session/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { flagSession, resumeSession, submitSession, getSessionById } from '$lib/server/db/sessions.js';
import { getViolationsForSession } from '$lib/server/db/violations.js';
import { gradeSession } from '$lib/server/db/results.js';
import { sendToStudent } from '$lib/server/ws/server.js';
import { logViolation } from '$lib/server/db/violations.js';

// GET — fetch violations for a session
export const GET: RequestHandler = async ({ url, locals }) => {
  requireInvigilatorOrAdmin(locals.user);

  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) error(400, 'session_id required');

  const violations = await getViolationsForSession(sessionId);
  return json({ violations });
};

// POST — pause / resume / force_submit
export const POST: RequestHandler = async ({ request, locals }) => {
  requireInvigilatorOrAdmin(locals.user);

  const { session_id, action, note } = await request.json();
  if (!session_id || !action) error(400, 'session_id and action required');

  const session = await getSessionById(session_id);
  if (!session) error(404, 'Session not found');

  if (action === 'pause') {
    await flagSession(session_id);
    await logViolation(session_id, 'invigilator_manual', 'exam_paused', note ?? 'Paused by invigilator');
    sendToStudent(session_id, { type: 'pause_session', session_id });
    return json({ ok: true, status: 'flagged' });
  }

  if (action === 'resume') {
    await resumeSession(session_id);
    sendToStudent(session_id, { type: 'resume_session', session_id });
    return json({ ok: true, status: 'in_progress' });
  }

  if (action === 'force_submit') {
    await submitSession(session_id, 'force_submitted');
    await gradeSession(session_id);
    await logViolation(session_id, 'invigilator_manual', 'auto_submitted', note ?? 'Force submitted by invigilator');
    sendToStudent(session_id, { type: 'force_submit', session_id });
    return json({ ok: true, status: 'force_submitted' });
  }

  error(400, 'Unknown action');
};