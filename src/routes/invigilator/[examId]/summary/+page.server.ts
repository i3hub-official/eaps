// src/routes/invigilator/[examId]/summary/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  await requireInvigilatorOrAdmin(locals.user);

  const assignment = await prisma.examInvigilator.findUnique({
    where: {
      examId_invigilatorId: {
        examId: params.examId,
        invigilatorId: locals.user.id,
      },
    },
  });
  if (!assignment) error(403, 'You are not assigned to this exam');

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { select: { code: true, title: true } },
      lecturer: { select: { title: true, fullName: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!exam) error(404, 'Exam not found');

  // All sessions for this exam
  const sessions = await prisma.examSession.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id: true, title: true, fullName: true,
          matricNumber: true, level: true,
          department: { select: { name: true } },
        },
      },
      violations: {
        select: { flagType: true, actionTaken: true, note: true, flaggedAt: true },
        orderBy: { flaggedAt: 'asc' },
      },
      examResult: {
        select: { score: true, percentage: true, passed: true, grade: true, timeTakenSecs: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── Aggregates ────────────────────────────────────────────────────────────
  const total        = sessions.length;
  const submitted    = sessions.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length;
  const forceSubmit  = sessions.filter(s => s.status === 'force_submitted').length;
  const notStarted   = sessions.filter(s => s.status === 'not_started').length;
  const inProgress   = sessions.filter(s => s.status === 'in_progress').length;
  const flagged      = sessions.filter(s => s.status === 'flagged').length;

  const totalViolations   = sessions.reduce((s, sess) => s + sess.violations.length, 0);
  const studentsViolated  = sessions.filter(s => s.violations.length > 0).length;

  // Violation type breakdown
  const violationBreakdown = sessions
    .flatMap(s => s.violations)
    .reduce((acc, v) => {
      acc[v.flagType] = (acc[v.flagType] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Flagged sessions (any violation)
  const flaggedSessions = sessions
    .filter(s => s.violations.length > 0)
    .sort((a, b) => b.violations.length - a.violations.length);

  // Pass/fail counts (from results)
  const results  = sessions.filter(s => s.examResult);
  const passed   = results.filter(s => s.examResult?.passed).length;
  const failed   = results.length - passed;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : null;

  const avgTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.examResult?.timeTakenSecs ?? 0), 0) / results.length / 60)
    : null;

  return {
    exam,
    sessions,
    flaggedSessions,
    violationBreakdown,
    stats: {
      total, submitted, forceSubmit, notStarted, inProgress, flagged,
      totalViolations, studentsViolated, passed, failed, passRate, avgTime,
    },
  };
};