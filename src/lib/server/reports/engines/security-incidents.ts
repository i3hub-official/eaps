// engines/security-incidents.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const SEVERITY_MAP: Record<string, string> = {
  copy_attempt: 'critical', devtools_open: 'high', screenshot_attempt: 'medium',
  multiple_faces: 'high', no_face_detected: 'high', invigilator_manual: 'high',
};
const DESCRIPTIONS: Record<string, string> = {
  multiple_faces:     'Multiple faces detected during exam session',
  no_face_detected:   'Face not visible for extended period',
  copy_attempt:       'Copy-paste attempt detected',
  devtools_open:      'Browser developer tools opened during exam',
  screenshot_attempt: 'Screenshot hotkey detected',
  invigilator_manual: 'Manual flag raised by invigilator',
};

const SecurityIncidentsEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();

    const violations = await prisma.violation.findMany({
      where: { flagType: { in: Object.keys(SEVERITY_MAP) as any[] } },
      select: {
        id: true, flagType: true, actionTaken: true, flaggedAt: true,
        session: {
          select: {
            student: { select: { fullName: true } },
            exam:    { select: { title: true, course: { select: { code: true } } } },
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
      take: 100,
    });

    return {
      incidents: violations.map((v, i) => ({
        id:          `INC-${String(i + 1).padStart(3, '0')}`,
        type:        v.flagType,
        description: DESCRIPTIONS[v.flagType] ?? 'Security incident detected',
        severity:    SEVERITY_MAP[v.flagType]  ?? 'medium',
        exam:        v.session?.exam?.course?.code
          ? `${v.session.exam.course.code} — ${v.session.exam.title}`
          : (v.session?.exam?.title ?? '—'),
        student:     v.session?.student?.fullName ?? 'Unknown',
        detectedAt:  v.flaggedAt ? v.flaggedAt.toISOString().replace('T', ' ').slice(0, 16) : '—',
        status:      'open' as const,
        action:      v.actionTaken ?? 'warning',
      })),
    };
  },
};

export default SecurityIncidentsEngine;