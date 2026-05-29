// src/routes/(admin)/security/violations/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

const SEVERITY_MAP: Record<string, string> = {
  tab_switch:         'medium',
  window_blur:        'low',
  fullscreen_exit:    'medium',
  copy_attempt:       'critical',
  devtools_open:      'high',
  screenshot_attempt: 'medium',
  multiple_faces:     'high',
  no_face_detected:   'high',
  invigilator_manual: 'high',
};

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q')?.trim() || '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── All queries in parallel ──────────────────────────────────────────────
  const [violations, totalCount, todayCount, typeCounts] = await Promise.all([

    // Main violations list with related data
    prisma.violation.findMany({
      where: searchQuery
        ? {
            OR: [
              { session: { student: { fullName:     { contains: searchQuery, mode: 'insensitive' } } } },
              { session: { student: { matricNumber: { contains: searchQuery, mode: 'insensitive' } } } },
              { flagType: { equals: searchQuery as any } },
            ],
          }
        : undefined,
      select: {
        id:         true,
        flagType:   true,
        actionTaken: true,
        flaggedAt:  true,
        session: {
          select: {
            student: { select: { fullName: true, matricNumber: true } },
            exam:    { select: { title: true, course: { select: { code: true } } } },
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
      take: 100,
    }),

    // Total all-time
    prisma.violation.count(),

    // Today's count
    prisma.violation.count({ where: { flaggedAt: { gte: today } } }),

    // Per-type counts for summary
    prisma.violation.groupBy({
      by: ['flagType'],
      _count: { _all: true },
    }),
  ]);

  // ── Format violations ────────────────────────────────────────────────────
  const formatted = violations.map((v, i) => ({
    id:        `V${String(i + 1).padStart(3, '0')}`,
    student:   v.session?.student?.fullName    ?? 'Unknown',
    matric:    v.session?.student?.matricNumber ?? '—',
    exam:      v.session?.exam?.course?.code
                 ? `${v.session.exam.course.code} — ${v.session.exam.title}`
                 : (v.session?.exam?.title ?? '—'),
    type:      v.flagType,
    action:    v.actionTaken ?? 'warning',
    flaggedAt: v.flaggedAt
                 ? v.flaggedAt.toISOString().replace('T', ' ').slice(0, 16)
                 : '—',
    severity:  SEVERITY_MAP[v.flagType] ?? 'medium',
  }));

  // ── Summary counts ───────────────────────────────────────────────────────
  const summary = {
    total:    totalCount,
    today:    todayCount,
    critical: typeCounts
      .filter(t => SEVERITY_MAP[t.flagType] === 'critical')
      .reduce((a, t) => a + t._count._all, 0),
    high: typeCounts
      .filter(t => SEVERITY_MAP[t.flagType] === 'high')
      .reduce((a, t) => a + t._count._all, 0),
    medium: typeCounts
      .filter(t => SEVERITY_MAP[t.flagType] === 'medium')
      .reduce((a, t) => a + t._count._all, 0),
    low: typeCounts
      .filter(t => SEVERITY_MAP[t.flagType] === 'low')
      .reduce((a, t) => a + t._count._all, 0),
  };

  return { violations: formatted, summary, searchQuery };
};