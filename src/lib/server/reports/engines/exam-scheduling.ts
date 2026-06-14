// engines/exam-scheduling.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const ExamSchedulingEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const [exams, scheduled, active, completed, cancelled, students] = await Promise.all([
      sql(`
        SELECT
          e.id, e.title, e.scheduled_start, e.scheduled_end,
          e.duration_minutes, e.status,
          c.code                                  AS course,
          COUNT(DISTINCT es.id)::int              AS students,
          COUNT(DISTINCT ei.invigilator_id)::int  AS invigilators
        FROM exams e
        LEFT JOIN courses c             ON e.course_id    = c.id
        LEFT JOIN exam_sessions es      ON es.exam_id     = e.id
        LEFT JOIN exam_invigilators ei  ON ei.exam_id     = e.id
        GROUP BY e.id, c.code
        ORDER BY e.scheduled_start ASC NULLS LAST
      `, []),
      sql(`SELECT COUNT(*)::int AS count FROM exams WHERE status = 'scheduled'`,  []),
      sql(`SELECT COUNT(*)::int AS count FROM exams WHERE status = 'active'`,     []),
      sql(`SELECT COUNT(*)::int AS count FROM exams WHERE status = 'completed'`,  []),
      sql(`SELECT COUNT(*)::int AS count FROM exams WHERE status = 'cancelled'`,  []),
      sql(`SELECT COUNT(*)::int AS count FROM exam_sessions`,                     []),
    ]);

    return {
      exams: exams.map((e: any) => ({
        id:           e.id.slice(0, 8),
        title:        `${e.course ?? '—'} — ${e.title}`,
        date:         e.scheduled_start ? new Date(e.scheduled_start).toISOString().split('T')[0] : '—',
        start:        e.scheduled_start ? new Date(e.scheduled_start).toISOString().split('T')[1].slice(0, 5) : '—',
        end:          e.scheduled_end   ? new Date(e.scheduled_end).toISOString().split('T')[1].slice(0, 5)   : '—',
        duration:     e.duration_minutes,
        status:       e.status,
        students:     e.students     || 0,
        invigilators: e.invigilators || 0,
      })),
      summary: {
        scheduled:     scheduled[0]?.count  || 0,
        active:        active[0]?.count     || 0,
        completed:     completed[0]?.count  || 0,
        cancelled:     cancelled[0]?.count  || 0,
        totalStudents: students[0]?.count   || 0,
      },
    };
  },
};

export default ExamSchedulingEngine;