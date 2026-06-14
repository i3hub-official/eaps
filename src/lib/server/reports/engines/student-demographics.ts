// engines/student-demographics.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const StudentDemographicsEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const [levels, colleges, departments] = await Promise.all([
      sql(`SELECT l.level, l.name, COUNT(u.id)::int AS count FROM levels l LEFT JOIN users u ON u.level_id = l.id AND u.role = 'student' WHERE l.level IS NOT NULL GROUP BY l.level, l.name ORDER BY l.level`),
      sql(`SELECT c.id, c.name, c.abbreviation, COUNT(u.id)::int AS students FROM colleges c LEFT JOIN departments d ON d.college_id = c.id LEFT JOIN users u ON u.department_id = d.id AND u.role = 'student' GROUP BY c.id, c.name, c.abbreviation ORDER BY students DESC`),
      sql(`SELECT d.name, c.abbreviation AS college, COUNT(u.id)::int AS students FROM departments d LEFT JOIN colleges c ON d.college_id = c.id LEFT JOIN users u ON u.department_id = d.id AND u.role = 'student' GROUP BY d.id, d.name, c.abbreviation ORDER BY students DESC`),
    ]);

    const total = levels.reduce((a: number, l: any) => a + (l.count || 0), 0);
    const pct   = (count: number) => total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;

    return {
      byLevel:      levels.map((l: any) => ({ level: l.name || `${l.level} Level`, count: l.count || 0, percentage: pct(l.count) })),
      byCollege:    colleges.map((c: any) => ({ name: c.name, abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(), count: c.students || 0, percentage: pct(c.students) })),
      byDepartment: departments.map((d: any) => ({ name: d.name, college: d.college || '—', count: d.students || 0, percentage: pct(d.students) })),
    };
  },
};

export default StudentDemographicsEngine;