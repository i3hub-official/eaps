import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [
    totalUsers,
    totalStudents,
    totalLecturers,
    totalInvigilators,
    totalExams,
    activeExams,
    completedExams,
    totalViolations,
    flaggedSessions,
    avgScoreResult,
    passRateResult,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM "User"`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'student'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'lecturer'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'invigilator'`,
    sql`SELECT COUNT(*)::int as count FROM "Exam"`,
    sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'active'`,
    sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'completed'`,
    sql`SELECT COUNT(*)::int as count FROM "Violation"`,
    sql`SELECT COUNT(*)::int as count FROM "ExamSession" WHERE status = 'flagged'`,
    sql`SELECT AVG(score)::numeric(10,1) as avg FROM "ExamResult"`,
    sql`SELECT COUNT(*)::int as count FROM "ExamResult" WHERE passed = true`,
  ]);

  const totalResults = await sql`SELECT COUNT(*)::int as count FROM "ExamResult"`;
  const total = totalResults[0]?.count || 0;
  const passed = passRateResult[0]?.count || 0;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  const recentActivity = await sql`
    SELECT al.id, al.action, al.entity, al."createdAt", u."fullName"
    FROM "AuditLog" al
    LEFT JOIN "User" u ON al."userId" = u.id
    ORDER BY al."createdAt" DESC
    LIMIT 10
  `;

  return {
    stats: {
      totalUsers: totalUsers[0]?.count || 0,
      totalStudents: totalStudents[0]?.count || 0,
      totalLecturers: totalLecturers[0]?.count || 0,
      totalInvigilators: totalInvigilators[0]?.count || 0,
      totalExams: totalExams[0]?.count || 0,
      activeExams: activeExams[0]?.count || 0,
      completedExams: completedExams[0]?.count || 0,
      totalViolations: totalViolations[0]?.count || 0,
      flaggedSessions: flaggedSessions[0]?.count || 0,
      avgScore: avgScoreResult[0]?.avg?.toString() || '0',
      passRate,
    },
    recentActivity: recentActivity.map(a => ({
      action: `${a.action} ${a.entity}`,
      time: new Date(a.createdAt).toLocaleString(),
      type: a.entity?.toLowerCase() || 'system',
    })),
  };
};
