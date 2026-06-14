// engines/session-semester.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const SessionSemesterEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const sessions = await sql(`
      SELECT
        e.session, e.semester,
        COUNT(DISTINCT e.id)::int                        AS exams,
        COUNT(DISTINCT es.student_id)::int               AS students,
        COALESCE(ROUND(AVG(er.score)::numeric, 1), 0)    AS avg_score,
        COUNT(CASE WHEN er.passed = true THEN 1 END)::int AS passed,
        COUNT(er.id)::int                                AS total_results
      FROM exams e
      LEFT JOIN exam_sessions es ON es.exam_id = e.id
      LEFT JOIN exam_results   er ON er.session_id = es.id
      GROUP BY e.session, e.semester
      ORDER BY e.session, e.semester
    `, []);

    return {
      sessions: sessions.map((s: any) => {
        const total    = s.total_results || 0;
        const passed   = s.passed || 0;
        const avgScore = parseFloat(s.avg_score) || 0;
        const passRate = total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 0;
        return {
          session: s.session as string, semester: s.semester as number,
          exams: s.exams || 0, students: s.students || 0,
          avgScore: parseFloat(avgScore.toFixed(1)), passRate,
          trend: passRate >= 70 ? 'up' : passRate >= 50 ? 'stable' : 'down',
        };
      }),
    };
  },
};

export default SessionSemesterEngine;