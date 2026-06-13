// src/lib/server/db/violations.ts

import { getPrismaClient } from './index.js';
import type { Violation, FlagType, ViolationAction } from '@prisma/client';


export type { Violation, FlagType, ViolationAction };

export async function logViolation(
  sessionId: string, flagType: FlagType,
  actionTaken?: ViolationAction, note?: string
) {
  const prisma = await getPrismaClient();

  return prisma.violation.create({ data: { sessionId, flagType, actionTaken, note } });
}

export async function getViolationsForSession(sessionId: string) {
  const prisma = await getPrismaClient();

  return prisma.violation.findMany({
    where: { sessionId },
    orderBy: { flaggedAt: 'desc' },
  });
}

export async function getViolationsForExam(examId: string) {
  const prisma = await getPrismaClient();

  return prisma.violation.findMany({
    where: { session: { examId } },
    include: { session: { include: { student: { select: { fullName: true, matricNumber: true } } } } },
    orderBy: { flaggedAt: 'desc' },
  });
}

export async function getViolationSummary(sessionId: string) {
  const prisma = await getPrismaClient();

  return prisma.violation.groupBy({
    by: ['flagType'],
    where: { sessionId },
    _count: { flagType: true },
  });
}

export async function addManualFlag(sessionId: string, note: string, actionTaken?: ViolationAction) {
  return logViolation(sessionId, 'invigilator_manual', actionTaken, note);
}
