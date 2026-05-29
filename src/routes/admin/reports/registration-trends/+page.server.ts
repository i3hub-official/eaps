import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [users, courseRegistrations] = await Promise.all([
    sql(
      `SELECT created_at, role FROM users WHERE created_at >= $1`,
      [sixMonthsAgo]
    ),
    sql(
      `SELECT session, semester, COUNT(*)::int AS count
       FROM course_registrations
       GROUP BY session, semester
       ORDER BY session DESC, semester ASC`
    ),
  ]);

  const monthlyMap = new Map<string, {
    newUsers: number;
    students: number;
    lecturers: number;
    invigilators: number;
  }>();

  for (const u of users) {
    const date  = new Date(u.created_at);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!monthlyMap.has(label)) {
      monthlyMap.set(label, { newUsers: 0, students: 0, lecturers: 0, invigilators: 0 });
    }

    const m = monthlyMap.get(label)!;
    m.newUsers++;
    if      (u.role === 'student')     m.students++;
    else if (u.role === 'lecturer')    m.lecturers++;
    else if (u.role === 'invigilator') m.invigilators++;
  }

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const maxCount = Math.max(...courseRegistrations.map((r: any) => r.count || 0), 1);

  return {
    monthlyData,
    courseRegistrations: courseRegistrations.map((r: any) => ({
      session:  r.session,
      semester: r.semester,
      count:    r.count || 0,
    })),
    maxCount,
  };
};