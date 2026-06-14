// engines/invigilator-assignments.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const InvigilatorAssignmentsEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const search = params.q ?? '';

    const invigilators = await sql(`
      SELECT
        u.id, u.full_name,
        COUNT(DISTINCT ei.exam_id)::int                                          AS assigned_exams,
        COUNT(DISTINCT es.id) FILTER (WHERE es.status = 'in_progress')::int      AS active_sessions,
        COUNT(DISTINCT es_all.id)::int                                           AS total_students,
        COUNT(v.id)::int                                                         AS violations_handled
      FROM users u
      LEFT JOIN exam_invigilators ei ON ei.invigilator_id = u.id
      LEFT JOIN exams e              ON e.id = ei.exam_id
      LEFT JOIN exam_sessions es_all ON es_all.exam_id = e.id
      LEFT JOIN exam_sessions es     ON es.invigilator_id = u.id
      LEFT JOIN violations v         ON v.session_id = es_all.id
      WHERE u.role = 'invigilator'
        ${search ? `AND u.full_name ILIKE $1` : ''}
      GROUP BY u.id, u.full_name
      ORDER BY active_sessions DESC, assigned_exams DESC
    `, search ? [`%${search}%`] : []);

    return {
      invigilators: invigilators.map((i: any) => ({
        id:                i.id,
        name:              i.full_name,
        assignedExams:     i.assigned_exams     || 0,
        activeSessions:    i.active_sessions    || 0,
        totalStudents:     i.total_students     || 0,
        violationsHandled: i.violations_handled || 0,
        responseTime:      '—',
        status:            (i.active_sessions || 0) > 0 ? 'active' : 'offline',
      })),
    };
  },
};

export default InvigilatorAssignmentsEngine;