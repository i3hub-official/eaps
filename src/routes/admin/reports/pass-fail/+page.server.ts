import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const overall = await sql`
    SELECT 
      COUNT(CASE WHEN passed = true THEN 1 END)::int as passed,
      COUNT(CASE WHEN passed = false THEN 1 END)::int as failed,
      COUNT(*)::int as total
    FROM "ExamResult"
  `;

  const byDepartment = await sql`
    SELECT 
      d.name as department,
      COUNT(CASE WHEN er.passed = true THEN 1 END)::int as passed,
      COUNT(CASE WHEN er.passed = false THEN 1 END)::int as failed,
      COUNT(er.id)::int as total
    FROM "Department" d
    LEFT JOIN "User" u ON u."departmentId" = d.id AND u.role = 'student'
    LEFT JOIN "ExamSession" es ON es."studentId" = u.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    GROUP BY d.name
  `;

  const overallData = overall[0];
  const overallTotal = overallData?.total || 0;
  const overallPassed = overallData?.passed || 0;
  const overallFailed = overallData?.failed || 0;

  const formatted = [
    {
      category: 'Overall',
      passed: overallPassed,
      failed: overallFailed,
      passRate: overallTotal > 0 ? parseFloat(((overallPassed / overallTotal) * 100).toFixed(1)) : 0,
      trend: 'up',
    },
    ...byDepartment.map((d: any) => {
      const total = d.total || 0;
      const passed = d.passed || 0;
      return {
        category: d.department,
        passed,
        failed: d.failed || 0,
        passRate: total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0,
        trend: total > 0 && (passed / total) >= 0.7 ? 'up' : 'down',
      };
    }),
  ];

  return { analysisData: formatted };
};
