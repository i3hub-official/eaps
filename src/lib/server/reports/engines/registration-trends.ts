// engines/registration-trends.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const RegistrationTrendsEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [users, courseRegistrations] = await Promise.all([
      sql(`SELECT created_at, role FROM users WHERE created_at >= $1`, [sixMonthsAgo]),
      sql(`SELECT session, semester, COUNT(*)::int AS count FROM course_registrations GROUP BY session, semester ORDER BY session DESC, semester ASC`),
    ]);

    const monthlyMap = new Map<string, { newUsers: number; students: number; lecturers: number; invigilators: number }>();

    for (const u of users) {
      const label = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyMap.has(label)) monthlyMap.set(label, { newUsers: 0, students: 0, lecturers: 0, invigilators: 0 });
      const m = monthlyMap.get(label)!;
      m.newUsers++;
      if      (u.role === 'student')     m.students++;
      else if (u.role === 'lecturer')    m.lecturers++;
      else if (u.role === 'invigilator') m.invigilators++;
    }

    return {
      monthlyData: Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()),
      courseRegistrations: courseRegistrations.map((r: any) => ({
        session: r.session, semester: r.semester, count: r.count || 0,
      })),
      maxCount: Math.max(...courseRegistrations.map((r: any) => r.count || 0), 1),
    };
  },
};

export default RegistrationTrendsEngine;