import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const exams = await sql`
    SELECT 
      e.id,
      e.title,
      e."scheduledStart",
      e."scheduledEnd",
      e."durationMinutes",
      e.status,
      c.code as course,
      COUNT(DISTINCT es.id)::int as students,
      COUNT(DISTINCT ei."invigilatorId")::int as invigilators
    FROM "Exam" e
    LEFT JOIN "Course" c ON e."courseId" = c.id
    LEFT JOIN "ExamSession" es ON es."examId" = e.id
    LEFT JOIN "ExamInvigilator" ei ON ei."examId" = e.id
    GROUP BY e.id, c.code
    ORDER BY e."scheduledStart" ASC
  `;

  const formatted = exams.map((e: any) => ({
    id: e.id.slice(0, 4),
    title: `${e.course} — ${e.title}`,
    date: e.scheduledStart ? new Date(e.scheduledStart).toISOString().split('T')[0] : '—',
    start: e.scheduledStart ? new Date(e.scheduledStart).toISOString().split('T')[1].slice(0, 5) : '—',
    end: e.scheduledEnd ? new Date(e.scheduledEnd).toISOString().split('T')[1].slice(0, 5) : '—',
    duration: e.durationMinutes,
    status: e.status,
    students: e.students || 0,
    invigilators: e.invigilators || 0,
    room: 'Online',
  }));

  const summary = {
    scheduled: await sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'scheduled'`.then(r => r[0]?.count || 0),
    active: await sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'active'`.then(r => r[0]?.count || 0),
    completed: await sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'completed'`.then(r => r[0]?.count || 0),
    cancelled: await sql`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'cancelled'`.then(r => r[0]?.count || 0),
    totalStudents: await sql`SELECT COUNT(*)::int as count FROM "ExamSession"`.then(r => r[0]?.count || 0),
  };

  return { exams: formatted, summary };
};
