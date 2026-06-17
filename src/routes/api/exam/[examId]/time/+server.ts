/**
 * src/routes/api/exam/[examId]/time/+server.ts
 *
 * GET ?sessionId=<uuid>
 *
 * Returns the authoritative server-side time remaining for a session.
 * Called by the kiosk timer every 30 seconds to correct drift.
 *
 * Response: { timeRemaining: number }  ← seconds
 */

import { json, error }         from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import {
  UUID_RE,
  computeDeadline,
  secondsRemaining,
  finalizeSession,
} from '$lib/server/exam/session-engine.js';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const user    = await requireStudent(locals.user);
  const examId  = params.examId;

  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam ID');

  const rawSessionId = url.searchParams.get('sessionId');
  if (!rawSessionId || !UUID_RE.test(rawSessionId)) throw error(400, 'Invalid sessionId');

  const prisma = await getPrismaClient();

  const session = await prisma.examSession.findUnique({
    where:  { id: rawSessionId },
    select: { id: true, studentId: true, examId: true, status: true, startedAt: true },
  });

  if (!session)                      throw error(404, 'Session not found');
  if (session.studentId !== user.id) throw error(403, 'Forbidden');
  if (session.examId    !== examId)  throw error(403, 'Forbidden');

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    return json({ timeRemaining: 0, status: 'submitted' });
  }
  if (session.status === 'flagged') {
    return json({ timeRemaining: 0, status: 'flagged' });
  }
  if (!session.startedAt) {
    return json({ timeRemaining: 0, status: 'not_started' });
  }

  const exam = await prisma.exam.findUnique({
    where:  { id: examId },
    select: { durationMinutes: true, scheduledEnd: true },
  });
  if (!exam) throw error(404, 'Exam not found');

  const deadline  = computeDeadline(exam as any, session.startedAt);
  const remaining = secondsRemaining(deadline);

  if (remaining <= 0 && session.status === 'in_progress') {
    await finalizeSession(session.id, 'force_submitted');
    return json({ timeRemaining: 0, status: 'submitted' });
  }

  return json({ timeRemaining: Math.max(0, remaining), status: session.status });
};