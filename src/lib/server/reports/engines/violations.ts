// engines/violations.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const SEVERITY_MAP: Record<string, string> = {
  tab_switch: 'medium', window_blur: 'low', fullscreen_exit: 'medium',
  copy_attempt: 'critical', devtools_open: 'high', screenshot_attempt: 'medium',
  multiple_faces: 'high', no_face_detected: 'high', invigilator_manual: 'high',
};

const ViolationsEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();
    const q      = params.q ?? '';
    const today  = new Date(); today.setHours(0, 0, 0, 0);

    const [violations, totalCount, todayCount, typeCounts] = await Promise.all([
      prisma.violation.findMany({
        where: q ? {
          OR: [
            { session: { student: { fullName:     { contains: q, mode: 'insensitive' } } } },
            { session: { student: { matricNumber: { contains: q, mode: 'insensitive' } } } },
            { flagType: { equals: q as any } },
          ],
        } : undefined,
        select: {
          id: true, flagType: true, actionTaken: true, flaggedAt: true,
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
      prisma.violation.count(),
      prisma.violation.count({ where: { flaggedAt: { gte: today } } }),
      prisma.violation.groupBy({ by: ['flagType'], _count: { _all: true } }),
    ]);

    return {
      violations: violations.map((v, i) => ({
        id:        `V${String(i + 1).padStart(3, '0')}`,
        student:   v.session?.student?.fullName     ?? 'Unknown',
        matric:    v.session?.student?.matricNumber ?? '—',
        exam:      v.session?.exam?.course?.code
          ? `${v.session.exam.course.code} — ${v.session.exam.title}`
          : (v.session?.exam?.title ?? '—'),
        type:      v.flagType,
        action:    v.actionTaken ?? 'warning',
        flaggedAt: v.flaggedAt ? v.flaggedAt.toISOString().replace('T', ' ').slice(0, 16) : '—',
        severity:  SEVERITY_MAP[v.flagType] ?? 'medium',
      })),
      summary: {
        total: totalCount, today: todayCount,
        critical: typeCounts.filter(t => SEVERITY_MAP[t.flagType] === 'critical').reduce((a, t) => a + t._count._all, 0),
        high:     typeCounts.filter(t => SEVERITY_MAP[t.flagType] === 'high').reduce((a, t) => a + t._count._all, 0),
        medium:   typeCounts.filter(t => SEVERITY_MAP[t.flagType] === 'medium').reduce((a, t) => a + t._count._all, 0),
        low:      typeCounts.filter(t => SEVERITY_MAP[t.flagType] === 'low').reduce((a, t) => a + t._count._all, 0),
      },
      searchQuery: q,
    };
  },
};

export default ViolationsEngine;