import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [allResults, departments] = await Promise.all([
    prisma.examResult.findMany({ select: { passed: true } }),
    prisma.department.findMany({
      select: {
        name: true,
        users: {
          where: { role: 'student' },
          select: {
            examSessions: {
              select: {
                examResult: { select: { passed: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const overallPassed = allResults.filter(r => r.passed).length;
  const overallFailed = allResults.filter(r => !r.passed).length;
  const overallTotal  = allResults.length;

  const formatted = [
    {
      category: 'Overall',
      passed:   overallPassed,
      failed:   overallFailed,
      passRate: overallTotal > 0
        ? parseFloat(((overallPassed / overallTotal) * 100).toFixed(1))
        : 0,
      trend: 'up',
    },
    ...departments.map(d => {
      const results = d.users.flatMap(u =>
        u.examSessions.flatMap(s => s.examResult ? [s.examResult] : [])
      );
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      const total  = results.length;
      return {
        category: d.name,
        passed,
        failed,
        passRate: total > 0
          ? parseFloat(((passed / total) * 100).toFixed(1))
          : 0,
        trend: total > 0 && passed / total >= 0.7 ? 'up' : 'down',
      };
    }),
  ];

  return { analysisData: formatted };
};