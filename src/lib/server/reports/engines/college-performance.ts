// engines/college-performance.ts
import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const CollegePerformanceEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const colleges = await sql(`
      SELECT
        c.id, c.name, c.abbreviation,
        COUNT(DISTINCT u.id)::int                                AS students,
        COUNT(DISTINCT e.id)::int                                AS exams,
        ROUND(AVG(er.score)::numeric, 1)                         AS avg_score,
        COUNT(er.id) FILTER (WHERE er.passed = true)::int        AS passed,
        COUNT(er.id)::int                                        AS total_results,
        (
          SELECT co.code FROM courses co
          JOIN departments dd ON co.department_id = dd.id
          JOIN exam_results er2 ON er2.exam_id IN (
            SELECT id FROM exams WHERE course_id = co.id
          )
          WHERE dd.college_id = c.id
          GROUP BY co.code ORDER BY COUNT(er2.id) DESC LIMIT 1
        ) AS top_course
      FROM colleges c
      LEFT JOIN departments d    ON d.college_id = c.id
      LEFT JOIN users u          ON u.department_id = d.id AND u.role = 'student'
      LEFT JOIN exam_sessions es ON es.student_id = u.id
      LEFT JOIN exam_results er  ON er.session_id = es.id
      LEFT JOIN exams e          ON e.course_id IN (
        SELECT id FROM courses WHERE department_id = d.id
      )
      GROUP BY c.id, c.name, c.abbreviation
      ORDER BY students DESC
    `, []);

    return {
      colleges: colleges.map((c: any) => {
        const total    = c.total_results || 0;
        const passed   = c.passed || 0;
        const avgScore = parseFloat(c.avg_score) || 0;
        return {
          id:           c.id,
          name:         c.name,
          abbreviation: c.abbreviation || c.name.slice(0, 4).toUpperCase(),
          students:     c.students  || 0,
          exams:        c.exams     || 0,
          avgScore:     parseFloat(avgScore.toFixed(1)),
          passRate:     total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0,
          topCourse:    c.top_course || '—',
          trend:        total > 0 && (passed / total) >= 0.7 ? 'up' : 'stable',
        };
      }),
    };
  },
};

export default CollegePerformanceEngine;