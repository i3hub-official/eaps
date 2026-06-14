// engines/user-overview.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const UserOverviewEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [total, students, lecturers, invigilators, admins, active, suspended, newThisMonth] =
      await Promise.all([
        sql(`SELECT COUNT(*)::int AS count FROM users`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'lecturer'`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'invigilator'`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE is_suspended = true`),
        sql(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1`, [oneMonthAgo]),
      ]);

    const s   = (rows: any[]) => rows[0]?.count || 0;
    const tot = s(total) || 1;
    const pct = (n: number) => parseFloat(((n / tot) * 100).toFixed(1));

    return {
      stats: {
        total:        s(total),        students:     s(students),
        lecturers:    s(lecturers),    invigilators: s(invigilators),
        admins:       s(admins),       active:       s(active),
        suspended:    s(suspended),    newThisMonth: s(newThisMonth),
      },
      roleDistribution: [
        { role: 'Students',     count: s(students),     percentage: pct(s(students)),     color: '#16a34a' },
        { role: 'Lecturers',    count: s(lecturers),    percentage: pct(s(lecturers)),    color: '#3b82f6' },
        { role: 'Invigilators', count: s(invigilators), percentage: pct(s(invigilators)), color: '#8b5cf6' },
        { role: 'Admins',       count: s(admins),       percentage: pct(s(admins)),       color: '#f59e0b' },
      ],
    };
  },
};

export default UserOverviewEngine;