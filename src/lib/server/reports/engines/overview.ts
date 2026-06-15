import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { sql } from '$lib/server/db/index.js';

const OverviewEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const [
      totalUsers, students, lecturers, invigilators,
      totalExams, activeExams, completedExams,
      totalViolations, flaggedSessions, avgScore, passedCount,
    ] = await Promise.all([
      sql(`SELECT COUNT(*)::int as count FROM "User"`, []),
      sql(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'student'`, []),
      sql(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'lecturer'`, []),
      sql(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'invigilator'`, []),
      sql(`SELECT COUNT(*)::int as count FROM "Exam"`, []),
      sql(`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'active'`, []),
      sql(`SELECT COUNT(*)::int as count FROM "Exam" WHERE status = 'completed'`, []),
      sql(`SELECT COUNT(*)::int as count FROM "Violation"`, []),
      sql(`SELECT COUNT(*)::int as count FROM "ExamSession" WHERE status = 'flagged'`, []),
      sql(`SELECT AVG(score)::numeric(10,1) as avg FROM "ExamResult"`, []),
      sql(`SELECT COUNT(*)::int as count FROM "ExamResult" WHERE passed = true`, []),
    ]);

    const [totalResults, recentActivity] = await Promise.all([
      sql(`SELECT COUNT(*)::int as count FROM "ExamResult"`, []),
      sql(`
        SELECT al.id, al.action, al.entity, al."createdAt", u."fullName"
        FROM "AuditLog" al
        LEFT JOIN "User" u ON al."userId" = u.id
        ORDER BY al."createdAt" DESC
        LIMIT 10
      `, []),
    ]);

    const total  = totalResults[0]?.count || 0;
    const passed = passedCount[0]?.count  || 0;

    return {
      stats: {
        totalUsers:        totalUsers[0]?.count        || 0,
        totalStudents:     students[0]?.count          || 0,
        totalLecturers:    lecturers[0]?.count         || 0,
        totalInvigilators: invigilators[0]?.count      || 0,
        totalExams:        totalExams[0]?.count        || 0,
        activeExams:       activeExams[0]?.count       || 0,
        completedExams:    completedExams[0]?.count    || 0,
        totalViolations:   totalViolations[0]?.count   || 0,
        flaggedSessions:   flaggedSessions[0]?.count   || 0,
        avgScore:          avgScore[0]?.avg?.toString() || '0',
        passRate:          total > 0 ? ((passed / total) * 100).toFixed(1) : '0',
      },
      recentActivity: recentActivity.map((a: any) => ({
        action: `${a.action} ${a.entity}`,
        time:   new Date(a.createdAt).toLocaleString(),
        type:   a.entity?.toLowerCase() || 'system',
      })),
    };
  },
};

export default OverviewEngine;