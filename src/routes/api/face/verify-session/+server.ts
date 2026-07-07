// src/routes/api/face/verify-session/+server.ts
// POST — records a successful face verification against the student's
// assessment session (stamps AssessmentSession.faceVerifiedAt/faceScore).
//
// ASSUMPTION: the client calls this with `examId` (really assessmentId) and
// no sessionId, matching the current +page.svelte. It looks up the most
// recent PENDING/IN_PROGRESS session for that student+assessment. If you'd
// rather have the client send sessionId directly (more precise, avoids the
// lookup), tell me and I'll swap the priority.

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const POST: RequestHandler = async (event) => {
  const { student } = await requireStudent(event);
  const body = await event.request.json();
  const { verified, similarityScore, examId, sessionId } = body;

  if (!verified) {
    return json({ recorded: false, reason: 'not verified' });
  }
  if (typeof similarityScore !== 'number' || similarityScore < 0 || similarityScore > 100) {
    error(400, 'Invalid similarityScore');
  }

  const prisma = await getPrismaClient();

  let session = null;
  if (sessionId) {
    session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== student.id) error(403, 'Forbidden');
  } else if (examId) {
    session = await prisma.assessmentSession.findFirst({
      where: {
        assessmentId: examId,
        studentId: student.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    error(400, 'examId or sessionId required');
  }

  if (!session) {
    // No session exists yet to attach this to — can happen if verification
    // runs before session creation. Nothing to persist server-side in that
    // case; flagging as a known gap rather than silently no-op-ing forever.
    return json({ recorded: false, reason: 'no matching session found' });
  }

  if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
    return json({ recorded: false, reason: 'session already closed' });
  }

  const updated = await prisma.assessmentSession.update({
    where: { id: session.id },
    data: {
      faceVerifiedAt: new Date(),
      faceScore: similarityScore / 100,
    },
  });

  return json({ recorded: true, sessionId: updated.id, faceScore: updated.faceScore });
};