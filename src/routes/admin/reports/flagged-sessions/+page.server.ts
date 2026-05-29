import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const sessions = await sql`
    SELECT 
      es.id,
      es.status,
      es."startedAt",
      es."submittedAt",
      u."fullName" as student,
      u."matricNumber" as matric,
      e.code as exam,
      inv."fullName" as invigilator,
      er.score,
      COUNT(v.id)::int as flags
    FROM "ExamSession" es
    LEFT JOIN "User" u ON es."studentId" = u.id
    LEFT JOIN "Exam" e ON es."examId" = e.id
    LEFT JOIN "User" inv ON es."invigilatorId" = inv.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    LEFT JOIN "Violation" v ON v."sessionId" = es.id
    WHERE es.status IN ('flagged', 'force_submitted')
    GROUP BY es.id, u."fullName", u."matricNumber", e.code, inv."fullName", er.score
    ORDER BY es."createdAt" DESC
  `;

  const formatted = sessions.map((s: any, i: number) => ({
    id: `S${String(i + 1).padStart(3, '0')}`,
    student: s.student || 'Unknown',
    matric: s.matric || '—',
    exam: s.exam || '—',
    flags: s.flags || 0,
    status: s.status,
    invigilator: s.invigilator || 'Unassigned',
    duration: s.startedAt && s.submittedAt
      ? `${Math.round((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)} min`
      : '—',
    score: s.score ? parseFloat(s.score) : 0,
  }));

  const summary = {
    total: await sql`SELECT COUNT(*)::int as count FROM "ExamSession" WHERE status IN ('flagged', 'force_submitted')`.then(r => r[0]?.count || 0),
    forceSubmitted: await sql`SELECT COUNT(*)::int as count FROM "ExamSession" WHERE status = 'force_submitted'`.then(r => r[0]?.count || 0),
    underReview: await sql`SELECT COUNT(*)::int as count FROM "ExamSession" WHERE status = 'flagged'`.then(r => r[0]?.count || 0),
    cleared: 0,
  };

  return { sessions: formatted, summary };
};
