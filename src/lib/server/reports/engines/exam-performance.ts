// engines/exam-performance.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const ExamPerformanceEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const [exams, totalsRows] = await Promise.all([
      sql(`
        SELECT
          e.id, e.title, e.status,
          c.code AS course,
          COUNT(DISTINCT es.id)::int                                          AS sessions,
          ROUND(AVG(es.score)::numeric, 1)                                    AS avg_score,
          COUNT(DISTINCT CASE WHEN er.passed = true THEN er.id END)::int      AS passed,
          COUNT(DISTINCT er.id)::int                                          AS total_results
        FROM exams e
        LEFT JOIN courses c        ON e.course_id = c.id
        LEFT JOIN exam_sessions es ON es.exam_id  = e.id
        LEFT JOIN exam_results  er ON er.exam_id  = e.id
        GROUP BY e.id, c.code
        ORDER BY e.created_at DESC LIMIT 100
      `, []),
      sql(`
        SELECT
          COUNT(*)::int                                               AS total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int      AS completed,
          COUNT(CASE WHEN status = 'active'    THEN 1 END)::int      AS active
        FROM exams
      `, []),
    ]);

    return {
      exams: exams.map((e: any) => ({
        id:       e.id.slice(0, 8),
        title:    `${e.course ?? '—'} — ${e.title}`,
        status:   e.status,
        sessions: e.sessions      || 0,
        avgScore: e.avg_score     ?? '—',
        passed:   e.passed        || 0,
        total:    e.total_results || 0,
        passRate: e.total_results > 0
          ? parseFloat(((e.passed / e.total_results) * 100).toFixed(1)) : 0,
      })),
      summary: {
        total:     totalsRows[0]?.total     || 0,
        completed: totalsRows[0]?.completed || 0,
        active:    totalsRows[0]?.active    || 0,
      },
    };
  },
};

export default ExamPerformanceEngine;