// src/routes/(admin)/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma, sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [userCounts, examCounts, recentActivity] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),

    prisma.exam.groupBy({ by: ['status'], _count: { status: true } }),

    sql<{ action: string; entity: string; user_name: string; created_at: Date }>(
      `SELECT al.action, al.entity, u.full_name AS user_name, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 20`
    ),
  ]);

  const totalStudents  = userCounts.find(u => u.role === 'student')?._count.role     ?? 0;
  const totalLecturers = userCounts.find(u => u.role === 'lecturer')?._count.role    ?? 0;
  const totalStaff     = userCounts.find(u => u.role === 'invigilator')?._count.role ?? 0;
  const activeExams    = examCounts.find(e => e.status === 'active')?._count.status  ?? 0;
  const totalExams     = examCounts.reduce((s, e) => s + e._count.status, 0);

  return { totalStudents, totalLecturers, totalStaff, activeExams, totalExams, recentActivity };
};