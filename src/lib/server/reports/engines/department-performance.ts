// engines/department-performance.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const DepartmentPerformanceEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const search = params.q ?? '';

    const departments = await sql(`
      SELECT
        d.id, d.name,
        c.abbreviation                                              AS college,
        COUNT(DISTINCT u.id)::int                                   AS students,
        COUNT(DISTINCT e.id)::int                                   AS exams,
        ROUND(AVG(er.score)::numeric, 1)                            AS avg_score,
        COUNT(er.id) FILTER (WHERE er.passed = true)::int           AS passed,
        COUNT(er.id)::int                                           AS total_results
      FROM departments d
      LEFT JOIN colleges c       ON d.college_id = c.id
      LEFT JOIN users u          ON u.department_id = d.id AND u.role = 'student'
      LEFT JOIN exam_sessions es ON es.student_id = u.id
      LEFT JOIN exam_results er  ON er.session_id = es.id
      LEFT JOIN exams e          ON e.course_id IN (
        SELECT id FROM courses WHERE department_id = d.id
      )
      ${search ? `WHERE d.name ILIKE $1 OR c.abbreviation ILIKE $1` : ''}
      GROUP BY d.id, d.name, c.abbreviation
      ORDER BY students DESC
    `, search ? [`%${search}%`] : []);

    return {
      departments: departments.map((d: any) => {
        const total    = d.total_results || 0;
        const passed   = d.passed || 0;
        const avgScore = parseFloat(d.avg_score) || 0;
        const ratio    = total > 0 ? passed / total : 0;
        return {
          id:       d.id,
          name:     d.name,
          college:  d.college || '—',
          students: d.students || 0,
          exams:    d.exams    || 0,
          avgScore: parseFloat(avgScore.toFixed(1)),
          passRate: total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0,
          trend:    ratio >= 0.7 ? 'up' : ratio >= 0.5 ? 'stable' : 'down',
        };
      }),
    };
  },
};

export default DepartmentPerformanceEngine;