// src/routes/(admin)/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  const prisma = await getPrismaClient();

  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCounts,
    examCounts,
    recentActivity,
    threatCount,
    weeklyExams,
    weeklyLogins,
    activeSessions,
  ] = await Promise.all([

    // User counts by role — covers all 8 UserRole values
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),

    // Exam counts by status
    prisma.exam.groupBy({
      by: ['status'],
      _count: { status: true },
    }),

    // Recent audit log activity
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        action:    true,
        entity:    true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    }),

    // Threats = violations in last 24h with serious flag types
    prisma.violation.count({
      where: {
        flaggedAt:  { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        flagType: {
          in: ['multiple_faces', 'no_face_detected', 'devtools_open', 'screenshot_attempt'],
        },
      },
    }),

    // Exams per day for last 7 days
    prisma.exam.findMany({
      where:   { createdAt: { gte: weekAgo } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Logins per day for last 7 days (auth sessions created)
    prisma.authSession.findMany({
      where:   { createdAt: { gte: weekAgo } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Active sessions right now
    prisma.authSession.count({
      where: { expiresAt: { gt: now } },
    }),

  ]);

  // ── Derived counts — one per UserRole ───────────────────────────
  const roleCount = (role: string) =>
    userCounts.find(u => u.role === role)?._count.role ?? 0;

  const totalStudents     = roleCount('student');
  const totalLecturers    = roleCount('lecturer');
  const totalStaff        = roleCount('invigilator'); // kept name for backward compat with existing template bindings
  const totalAdmins       = roleCount('admin');
  const totalHods         = roleCount('hod');
  const totalDeans        = roleCount('dean');
  const totalExamOfficers = roleCount('exam_officer');
  const totalVcDvc        = roleCount('vc_dvc');

  const activeExams = examCounts.find(e => e.status === 'active')?._count.status ?? 0;
  const totalExams  = examCounts.reduce((s, e) => s + e._count.status, 0);

  // ── Shape audit logs ────────────────────────────────────────────
  const activity = recentActivity.map(l => ({
    action:    l.action,
    entity:    l.entity ?? null,
    user_name: l.user?.fullName ?? null,
    created_at: l.createdAt,
  }));

  // ── Weekly chart data (last 7 days, grouped by day) ─────────────
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function groupByDay(items: { createdAt: Date }[]) {
    const map: Record<number, number> = {};
    for (const item of items) {
      const d = new Date(item.createdAt).getDay();
      map[d] = (map[d] ?? 0) + 1;
    }
    return map;
  }

  const examsByDay  = groupByDay(weeklyExams);
  const loginsByDay = groupByDay(weeklyLogins);

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d    = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const idx  = d.getDay();
    return {
      day:    DAY_LABELS[idx],
      exams:  examsByDay[idx]  ?? 0,
      logins: loginsByDay[idx] ?? 0,
    };
  });

  return {
    totalStudents,
    totalLecturers,
    totalStaff,
    totalAdmins,
    totalHods,
    totalDeans,
    totalExamOfficers,
    totalVcDvc,
    activeExams,
    totalExams,
    threatCount,
    activeSessions,
    recentActivity: activity,
    weeklyData,
  };
};