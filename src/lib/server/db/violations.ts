import { prisma } from './index.js';
import type { Violation, FlagType, ViolationAction } from '@prisma/client';

export type { Violation, FlagType, ViolationAction };

export async function logViolation(
  sessionId: string, flagType: FlagType,
  actionTaken?: ViolationAction, note?: string
) {
  return prisma.violation.create({ data: { sessionId, flagType, actionTaken, note } });
}

export async function getViolationsForSession(sessionId: string) {
  return prisma.violation.findMany({
    where: { sessionId },
    orderBy: { flaggedAt: 'desc' },
  });
}

export async function getViolationsForExam(examId: string) {
  return prisma.violation.findMany({
    where: { session: { examId } },
    include: { session: { include: { student: { select: { fullName: true, matricNumber: true } } } } },
    orderBy: { flaggedAt: 'desc' },
  });
}

export async function getViolationSummary(sessionId: string) {
  return prisma.violation.groupBy({
    by: ['flagType'],
    where: { sessionId },
    _count: { flagType: true },
  });
}

export async function addManualFlag(sessionId: string, note: string, actionTaken?: ViolationAction) {
  return logViolation(sessionId, 'invigilator_manual', actionTaken, note);
}
