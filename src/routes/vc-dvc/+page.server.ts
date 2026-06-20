// src/routes/vc-dvc/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireVcDvc(locals.user);
  const prisma = await getPrismaClient();

  const [
    totalStudents,
    totalStaff,
    totalExams,
    examStats,
    collegeStats,
    passFailStats,
    recentExams,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'student', isActive: true } }),

    prisma.user.count({
      where: { role: { in: ['lecturer', 'hod', 'dean', 'invigilator', 'exam_officer'] }, isActive: true },
    }),

    prisma.exam.count(),

    prisma.exam.groupBy({ by: ['status'], _count: { _all: true } }),

    // Exams per college
    prisma.college.findMany({
      select: {
        name: true, abbreviation: true,
        departments: {
          select: {
            courses: {
              select: { exams: { select: { id: true, status: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),

    // Pass/fail ratio
    prisma.examResult.groupBy({
      by: ['passed'],
      _count: { _all: true },
    }),

    // 6 most recent exams
    prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, title: true, status: true, scheduledStart: true,
        course: { select: { code: true, department: { select: { college: { select: { abbreviation: true } } } } } },
        _count: { select: { examSessions: true } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(examStats.map(e => [e.status, e._count._all]));
  const passMap   = Object.fromEntries(passFailStats.map(e => [String(e.passed), e._count._all]));

  // Flatten college → exam counts
  const collegeBreakdown = collegeStats.map(c => {
    const exams = c.departments.flatMap(d => d.courses.flatMap(co => co.exams));
    return {
      name:        c.abbreviation ?? c.name,
      total:       exams.length,
      active:      exams.filter(e => e.status === 'active').length,
      completed:   exams.filter(e => e.status === 'completed').length,
    };
  });

  return {
    totalStudents,
    totalStaff,
    totalExams,
    examCounts: {
      active:    statusMap['active']    ?? 0,
      scheduled: statusMap['scheduled'] ?? 0,
      completed: statusMap['completed'] ?? 0,
      draft:     statusMap['draft']     ?? 0,
    },
    passCount: passMap['true']  ?? 0,
    failCount: passMap['false'] ?? 0,
    collegeBreakdown,
    recentExams,
  };
};
