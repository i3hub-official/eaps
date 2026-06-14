// engines/level-analysis.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const LevelAnalysisEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();

    const levelsWithStudents = await prisma.level.findMany({
      where: { users: { some: { role: 'student', isActive: true } } },
      orderBy: { level: 'asc' },
    });

    const levels = await Promise.all(levelsWithStudents.map(async (lvl) => {
      const [students, availableExams, sessions, deptCounts] = await Promise.all([
        prisma.user.count({ where: { role: 'student', levelId: lvl.id, isActive: true } }),
        prisma.exam.count({
          where: {
            status: { in: ['scheduled', 'active', 'completed'] },
            examLevels: { some: { levelId: lvl.id } },
          },
        }),
        prisma.examSession.findMany({
          where: {
            student: { levelId: lvl.id, role: 'student', isActive: true },
            status: { in: ['submitted', 'force_submitted'] },
          },
          include: { examResult: true },
        }),
        prisma.user.groupBy({
          by: ['departmentId'],
          where: { role: 'student', levelId: lvl.id, isActive: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        }),
      ]);

      const totalResults = sessions.filter(s => s.examResult).length;
      const passed       = sessions.filter(s => s.examResult?.passed === true).length;
      const avgScore     = totalResults > 0
        ? sessions
            .filter(s => s.examResult?.percentage)
            .reduce((acc, s) => acc + (s.examResult?.percentage?.toNumber() || 0), 0) / totalResults
        : 0;
      const passRate = totalResults > 0 ? (passed / totalResults) * 100 : 0;

      let topDept = '—';
      if (deptCounts[0]?.departmentId) {
        const dept = await prisma.department.findUnique({
          where: { id: deptCounts[0].departmentId },
          select: { name: true },
        });
        topDept = dept?.name || '—';
      }

      return {
        level:          lvl.level,
        students,
        exams:          availableExams,
        examsTaken:     sessions.length,
        examsCompleted: totalResults,
        avgScore:       parseFloat(avgScore.toFixed(1)),
        passRate:       parseFloat(passRate.toFixed(1)),
        topDept,
        trend:          passRate >= 70 ? 'up' : passRate > 0 && passRate <= 40 ? 'down' : 'stable',
      };
    }));

    return { levels };
  },
};

export default LevelAnalysisEngine;