// src/routes/hod/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireHod(locals.user);
  const prisma  = await getPrismaClient();
  const deptId  = locals.user!.departmentId;

  const [lecturerCount, examStats, recentExams, recentResults] = await Promise.all([
    // Lecturers in this department
    prisma.user.count({
      where: { departmentId: deptId, role: 'lecturer', isActive: true },
    }),

    // Exam counts by status for this department
    prisma.exam.groupBy({
      by: ['status'],
      where: { examDepartments: { some: { departmentId: deptId! } } },
      _count: { _all: true },
    }),

    // 5 most recent exams
    prisma.exam.findMany({
      where: { examDepartments: { some: { departmentId: deptId! } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, status: true, scheduledStart: true,
        course: { select: { code: true } },
        lecturer: { select: { fullName: true } },
        _count: { select: { examSessions: true } },
      },
    }),

    // 5 most recent completed results in this dept
    prisma.examResult.findMany({
      where: { exam: { examDepartments: { some: { departmentId: deptId! } } } },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: {
        id: true, score: true, percentage: true, passed: true, grade: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: { select: { title: true, course: { select: { code: true } } } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(examStats.map(e => [e.status, e._count._all]));

  return {
    lecturerCount,
    examCounts: {
      active:    statusMap['active']    ?? 0,
      scheduled: statusMap['scheduled'] ?? 0,
      completed: statusMap['completed'] ?? 0,
      draft:     statusMap['draft']     ?? 0,
    },
    recentExams,
    recentResults,
    deptId,
  };
};