// src/jobs/finalize-expired-sessions.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { computeDeadline, finalizeSession } from '$lib/server/exam/session-engine.js';

/**
 * Sweeps all 'in_progress' sessions and force-submits any whose deadline
 * has passed. Catches students who disconnected entirely and never hit
 * submit. Safe to run frequently — finalizeSession is idempotent.
 */
export async function finalizeExpiredSessions(): Promise<{ checked: number; finalized: number }> {
  const prisma = await getPrismaClient();
  const now = new Date();

  const sessions = await prisma.examSession.findMany({
    where: { status: 'in_progress', startedAt: { not: null } },
    include: { exam: true },
  });

  let finalized = 0;
  for (const session of sessions) {
    if (!session.startedAt) continue;
    const deadline = computeDeadline(session.exam, session.startedAt);
    if (now >= deadline) {
      await finalizeSession(session.id, 'force_submitted');
      finalized++;
    }
  }

  if (finalized > 0) {
    console.log(`[jobs] finalize-expired-sessions: force-submitted ${finalized}/${sessions.length} expired sessions`);
  }

  return { checked: sessions.length, finalized };
}