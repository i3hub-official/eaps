// src/routes/(admin)/security/incidents/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

const SEVERITY_MAP: Record<string, string> = {
  copy_attempt:        'critical',
  devtools_open:       'high',
  screenshot_attempt:  'medium',
  multiple_faces:      'high',
  no_face_detected:    'high',
  invigilator_manual:  'high',
};

const DESCRIPTIONS: Record<string, string> = {
  multiple_faces:     'Multiple faces detected during exam session',
  no_face_detected:   'Face not visible for extended period',
  copy_attempt:       'Copy-paste attempt detected',
  devtools_open:      'Browser developer tools opened during exam',
  screenshot_attempt: 'Screenshot hotkey detected',
  invigilator_manual: 'Manual flag raised by invigilator',
};

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const violations = await prisma.violation.findMany({
    where: {
      flagType: {
        in: [
          'multiple_faces',
          'no_face_detected',
          'copy_attempt',
          'devtools_open',
          'screenshot_attempt',
          'invigilator_manual',
        ],
      },
    },
    select: {
      id:          true,
      flagType:    true,
      actionTaken: true,
      flaggedAt:   true,
      session: {
        select: {
          student: { select: { fullName: true } },
          exam: {
            select: {
              title: true,
              course: { select: { code: true } },
            },
          },
        },
      },
    },
    orderBy: { flaggedAt: 'desc' },
    take: 100,
  });

  const incidents = violations.map((v, i) => ({
    id:          `INC-${String(i + 1).padStart(3, '0')}`,
    type:        v.flagType,
    description: DESCRIPTIONS[v.flagType] ?? 'Security incident detected',
    severity:    SEVERITY_MAP[v.flagType]  ?? 'medium',
    exam:        v.session?.exam?.course?.code
                   ? `${v.session.exam.course.code} — ${v.session.exam.title}`
                   : (v.session?.exam?.title ?? '—'),
    student:     v.session?.student?.fullName ?? 'Unknown',
    detectedAt:  v.flaggedAt
                   ? v.flaggedAt.toISOString().replace('T', ' ').slice(0, 16)
                   : '—',
    status:      'open' as const,   // extend when a resolution workflow is added
    action:      v.actionTaken ?? 'warning',
  }));

  return { incidents };
};