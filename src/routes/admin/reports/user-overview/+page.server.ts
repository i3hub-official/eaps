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
    totalAdmins,
    activeUsers,
    suspendedUsers,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM "User"`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'student'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'lecturer'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'invigilator'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'admin'`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE "isActive" = true`,
    sql`SELECT COUNT(*)::int as count FROM "User" WHERE "isSuspended" = true`,
  ]);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const newThisMonth = await sql`SELECT COUNT(*)::int as count FROM "User" WHERE "createdAt" >= ${oneMonthAgo}`;

  const total = totalUsers[0]?.count || 1;

  return {
    stats: {
      total: totalUsers[0]?.count || 0,
      students: totalStudents[0]?.count || 0,
      lecturers: totalLecturers[0]?.count || 0,
      invigilators: totalInvigilators[0]?.count || 0,
      admins: totalAdmins[0]?.count || 0,
      active: activeUsers[0]?.count || 0,
      suspended: suspendedUsers[0]?.count || 0,
      newThisMonth: newThisMonth[0]?.count || 0,
    },
    roleDistribution: [
      { role: 'Students', count: totalStudents[0]?.count || 0, percentage: parseFloat((((totalStudents[0]?.count || 0) / total) * 100).toFixed(1)), color: '#16a34a' },
      { role: 'Lecturers', count: totalLecturers[0]?.count || 0, percentage: parseFloat((((totalLecturers[0]?.count || 0) / total) * 100).toFixed(1)), color: '#3b82f6' },
      { role: 'Invigilators', count: totalInvigilators[0]?.count || 0, percentage: parseFloat((((totalInvigilators[0]?.count || 0) / total) * 100).toFixed(1)), color: '#8b5cf6' },
      { role: 'Admins', count: totalAdmins[0]?.count || 0, percentage: parseFloat((((totalAdmins[0]?.count || 0) / total) * 100).toFixed(1)), color: '#f59e0b' },
    ],
  };
};
