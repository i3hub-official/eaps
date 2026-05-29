import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  let query = sql`
    SELECT 
      u.id,
      u."fullName",
      COUNT(DISTINCT ei."examId")::int as assigned_exams,
      COUNT(DISTINCT CASE WHEN es.status = 'active' THEN es.id END)::int as active_sessions,
      COUNT(DISTINCT es_all.id)::int as total_students,
      COUNT(v.id)::int as violations_handled
    FROM "User" u
    LEFT JOIN "ExamInvigilator" ei ON ei."invigilatorId" = u.id
    LEFT JOIN "Exam" e ON e.id = ei."examId"
    LEFT JOIN "ExamSession" es_all ON es_all."examId" = e.id
    LEFT JOIN "ExamSession" es ON es."invigilatorId" = u.id
    LEFT JOIN "Violation" v ON v."sessionId" = es_all.id
    WHERE u.role = 'invigilator'
  `;

  if (searchQuery) {
    query = sql`${query} AND u."fullName" ILIKE ${'%' + searchQuery + '%'}`;
  }

  query = sql`${query} GROUP BY u.id`;

  const invigilators = await query;

  const formatted = invigilators.map((i: any) => ({
    id: i.id,
    name: i.fullName,
    assignedExams: i.assigned_exams || 0,
    activeSessions: i.active_sessions || 0,
    totalStudents: i.total_students || 0,
    violationsHandled: i.violations_handled || 0,
    responseTime: '45 sec',
    status: (i.active_sessions || 0) > 0 ? 'active' : 'offline',
  }));

  return { invigilators: formatted };
};
