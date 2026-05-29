import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      v.id,
      v."flagType",
      v."actionTaken",
      v."flaggedAt",
      u."fullName" as student,
      u."matricNumber" as matric,
      e.code as exam
    FROM "Violation" v
    LEFT JOIN "ExamSession" es ON v."sessionId" = es.id
    LEFT JOIN "User" u ON es."studentId" = u.id
    LEFT JOIN "Exam" e ON es."examId" = e.id
    WHERE 1=1
  `;

  if (searchQuery) {
    query = sql`${query} AND (u."fullName" ILIKE ${'%' + searchQuery + '%'} OR u."matricNumber" ILIKE ${'%' + searchQuery + '%'} OR v."flagType" ILIKE ${'%' + searchQuery + '%'})`;
  }

  query = sql`${query} ORDER BY v."flaggedAt" DESC LIMIT 100`;

  const violations = await query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await sql`
    SELECT COUNT(*)::int as count FROM "Violation" WHERE "flaggedAt" >= ${today}
  `;

  const severityMap: Record<string, string> = {
    tab_switch: 'medium', window_blur: 'low', fullscreen_exit: 'medium',
    copy_attempt: 'critical', devtools_open: 'high', screenshot_attempt: 'medium',
    multiple_faces: 'high', no_face_detected: 'high', invigilator_manual: 'high',
  };

  const formatted = violations.map((v: any, i: number) => ({
    id: `V${String(i + 1).padStart(3, '0')}`,
    student: v.student || 'Unknown',
    matric: v.matric || '—',
    exam: v.exam || '—',
    type: v.flagType,
    action: v.actionTaken || 'warning',
    flaggedAt: v.flaggedAt ? new Date(v.flaggedAt).toISOString().replace('T', ' ').slice(0, 16) : '—',
    severity: severityMap[v.flagType] || 'medium',
  }));

  const totalResult = await sql`SELECT COUNT(*)::int as count FROM "Violation"`;
  const typeCounts = await sql`
    SELECT "flagType", COUNT(*)::int as count FROM "Violation" GROUP BY "flagType"
  `;

  const summary = {
    total: totalResult[0]?.count || 0,
    today: todayCount[0]?.count || 0,
    critical: typeCounts.filter((t: any) => severityMap[t.flagType] === 'critical').reduce((a: number, t: any) => a + t.count, 0),
    high: typeCounts.filter((t: any) => severityMap[t.flagType] === 'high').reduce((a: number, t: any) => a + t.count, 0),
    medium: typeCounts.filter((t: any) => severityMap[t.flagType] === 'medium').reduce((a: number, t: any) => a + t.count, 0),
    low: typeCounts.filter((t: any) => severityMap[t.flagType] === 'low').reduce((a: number, t: any) => a + t.count, 0),
  };

  return { violations: formatted, summary };
};
