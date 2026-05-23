// src/lib/server/exam/scheduler.ts
import { prisma } from '$lib/server/db/index.js';

/**
 * Activate all exams whose scheduled_start has passed and are still 'scheduled'.
 * Completes all exams whose scheduled_end has passed and are still 'active'.
 * Call this on a timer (e.g. every 60s from hooks.server.ts).
 */
export async function tickExamScheduler(): Promise<void> {
  const now = new Date();

  // scheduled → active
  await prisma.exam.updateMany({
    where: { status: 'scheduled', scheduledStart: { lte: now } },
    data:  { status: 'active' },
  });

  // active → completed (past scheduled end)
  await prisma.exam.updateMany({
    where: { status: 'active', scheduledEnd: { lte: now } },
    data:  { status: 'completed' },
  });
}