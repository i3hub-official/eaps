// src/routes/(admin)/admin/reports/level-analysis/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  // Get all levels that have students
  const levelsWithStudents = await prisma.user.findMany({
    where: { role: 'student', level: { not: null }, isActive: true },
    select: { level: true },
    distinct: ['level'],
    orderBy: { level: 'asc' },
  });

  const levels = levelsWithStudents.map((s) => s.level).filter(Boolean) as number[];

  const formatted = await Promise.all(
    levels.map(async (level) => {
      // 1. Count active students at this level
      const students = await prisma.user.count({
        where: { role: 'student', level, isActive: true },
      });

      // 2. Count exams available to this level (using the levels array on Exam)
      const availableExams = await prisma.exam.count({
        where: {
          status: { in: ['scheduled', 'active', 'completed'] },
          levels: { has: level },
        },
      });

      // 3. Get all exam sessions & results for students at this level
      const sessions = await prisma.examSession.findMany({
        where: {
          student: { level, role: 'student', isActive: true },
          status: { in: ['submitted', 'force_submitted'] },
        },
        include: {
          examResult: true,
          exam: { select: { id: true } },
        },
      });

      const totalResults = sessions.filter((s) => s.examResult).length;
      const passed = sessions.filter((s) => s.examResult?.passed === true).length;
      const avgScore =
        totalResults > 0
          ? sessions
              .filter((s) => s.examResult?.percentage)
              .reduce((acc, s) => acc + (s.examResult?.percentage?.toNumber() || 0), 0) /
            totalResults
          : 0;

      const passRate = totalResults > 0 ? (passed / totalResults) * 100 : 0;

      // 4. Top department by student count at this level
      const deptCounts = await prisma.user.groupBy({
        by: ['departmentId'],
        where: { role: 'student', level, isActive: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      });

      let topDept = '—';
      if (deptCounts[0]?.departmentId) {
        const dept = await prisma.department.findUnique({
          where: { id: deptCounts[0].departmentId },
          select: { name: true },
        });
        topDept = dept?.name || '—';
      }

      // 5. Trend: compare current semester vs previous (simplified)
      // For now, use passRate as proxy for trend direction
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (passRate >= 70) trend = 'up';
      else if (passRate > 0 && passRate <= 40) trend = 'down';

      return {
        level,
        students,
        exams: availableExams,
        examsTaken: sessions.length,
        examsCompleted: totalResults,
        avgScore: parseFloat(avgScore.toFixed(1)),
        passRate: parseFloat(passRate.toFixed(1)),
        topDept,
        trend,
      };
    })
  );

  return { levels: formatted };
};