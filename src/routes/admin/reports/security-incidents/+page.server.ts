import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const violations = await sql`
    SELECT 
      v.id,
      v."flagType",
      v."actionTaken",
      v."flaggedAt",
      u."fullName" as student,
      e.code as exam
    FROM "Violation" v
    LEFT JOIN "ExamSession" es ON v."sessionId" = es.id
    LEFT JOIN "User" u ON es."studentId" = u.id
    LEFT JOIN "Exam" e ON es."examId" = e.id
    WHERE v."flagType" IN ('multiple_faces', 'no_face_detected', 'copy_attempt', 'devtools_open', 'screenshot_attempt', 'invigilator_manual')
    ORDER BY v."flaggedAt" DESC
    LIMIT 100
  `;

  const severityMap: Record<string, string> = {
    copy_attempt: 'critical', devtools_open: 'high', screenshot_attempt: 'medium',
    multiple_faces: 'high', no_face_detected: 'high', invigilator_manual: 'high',
  };

  const descriptions: Record<string, string> = {
    multiple_faces: 'Multiple faces detected during exam session',
    no_face_detected: 'Face not visible for extended period',
    copy_attempt: 'Copy-paste attempt detected',
    devtools_open: 'Browser developer tools opened during exam',
    screenshot_attempt: 'Screenshot hotkey detected',
    invigilator_manual: 'Manual flag by invigilator',
  };

  const formatted = violations.map((v: any, i: number) => ({
    id: `INC-${String(i + 1).padStart(3, '0')}`,
    type: v.flagType,
    description: descriptions[v.flagType] || 'Security incident detected',
    severity: severityMap[v.flagType] || 'medium',
    exam: v.exam || '—',
    student: v.student || 'Unknown',
    detectedAt: v.flaggedAt ? new Date(v.flaggedAt).toISOString().replace('T', ' ').slice(0, 16) : '—',
    status: 'resolved',
    action: v.actionTaken || 'warning',
  }));

  return { incidents: formatted };
};
