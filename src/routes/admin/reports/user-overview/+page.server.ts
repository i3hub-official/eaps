import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [
    totalUsers,
    totalStudents,
    totalLecturers,
    totalInvigilators,
    totalAdmins,
    activeUsers,
    suspendedUsers,
    newThisMonth,
  ] = await Promise.all([
    sql(`SELECT COUNT(*)::int AS count FROM users`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'lecturer'`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'invigilator'`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE is_suspended = true`),
    sql(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1`, [oneMonthAgo]),
  ]);

  const total = totalUsers[0]?.count || 1;

  function pct(count: number) {
    return parseFloat(((count / total) * 100).toFixed(1));
  }

  const s = (rows: any[]) => rows[0]?.count || 0;

  return {
    stats: {
      total:        s(totalUsers),
      students:     s(totalStudents),
      lecturers:    s(totalLecturers),
      invigilators: s(totalInvigilators),
      admins:       s(totalAdmins),
      active:       s(activeUsers),
      suspended:    s(suspendedUsers),
      newThisMonth: s(newThisMonth),
    },
    roleDistribution: [
      { role: 'Students',     count: s(totalStudents),     percentage: pct(s(totalStudents)),     color: '#16a34a' },
      { role: 'Lecturers',    count: s(totalLecturers),    percentage: pct(s(totalLecturers)),    color: '#3b82f6' },
      { role: 'Invigilators', count: s(totalInvigilators), percentage: pct(s(totalInvigilators)), color: '#8b5cf6' },
      { role: 'Admins',       count: s(totalAdmins),       percentage: pct(s(totalAdmins)),       color: '#f59e0b' },
    ],
  };
};