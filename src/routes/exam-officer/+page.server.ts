// src/routes/exam-officer/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireExamOfficer(locals.user);
  const prisma = await getPrismaClient();

  const [examStats, recentExams, recentResults, collegeBreakdown] = await Promise.all([
    // University-wide exam counts by status
    prisma.exam.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),

    // 8 most recent exams university-wide
    prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, title: true, status: true, scheduledStart: true, session: true, semester: true,
        course: { select: { code: true, department: { select: { name: true, college: { select: { abbreviation: true } } } } } },
        lecturer: { select: { fullName: true } },
        _count: { select: { examSessions: true } },
      },
    }),

    // 5 most recent results
    prisma.examResult.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: {
        id: true, percentage: true, passed: true, grade: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: { select: { title: true, course: { select: { code: true } } } },
      },
    }),

    // Per-college exam count for quick overview
    prisma.exam.groupBy({
      by: ['semester'],
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(examStats.map(e => [e.status, e._count._all]));

  return {
    examCounts: {
      total:     examStats.reduce((s, e) => s + e._count._all, 0),
      active:    statusMap['active']    ?? 0,
      scheduled: statusMap['scheduled'] ?? 0,
      completed: statusMap['completed'] ?? 0,
      draft:     statusMap['draft']     ?? 0,
    },
    recentExams,
    recentResults,
  };
};
