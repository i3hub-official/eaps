// src/routes/dean/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireDean(locals.user);
  const prisma    = await getPrismaClient();
  const collegeId = locals.user!.collegeId!;

  const [deptCount, hodCount, lecturerCount, examStats, recentExams] = await Promise.all([
    prisma.department.count({ where: { collegeId } }),
    prisma.user.count({ where: { department: { collegeId }, role: 'hod', isActive: true } }),
    prisma.user.count({ where: { department: { collegeId }, role: 'lecturer', isActive: true } }),
    prisma.exam.groupBy({
      by: ['status'],
      where: { course: { department: { collegeId } } },
      _count: { _all: true },
    }),
    prisma.exam.findMany({
      where: { course: { department: { collegeId } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, title: true, status: true, scheduledStart: true,
        course: { select: { code: true, department: { select: { name: true } } } },
        lecturer: { select: { fullName: true } },
        _count: { select: { examSessions: true } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(examStats.map(e => [e.status, e._count._all]));

  return {
    deptCount, hodCount, lecturerCount,
    examCounts: {
      active:    statusMap['active']    ?? 0,
      scheduled: statusMap['scheduled'] ?? 0,
      completed: statusMap['completed'] ?? 0,
    },
    recentExams,
  };
};