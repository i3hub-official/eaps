// lib/server/reports/registry.ts

import type { ReportMeta } from './schemas.js';

export const REPORT_REGISTRY: Record<string, ReportMeta> = {
    'grade-distribution': { id: 'grade-distribution', label: 'Grade Distribution', description: 'Breakdown of student scores across grade bands', engine: () => import('./engines/grade-distribution.js'), supportsSearch: false, supportsDateRange: false, exportable: true, },
    'audit-logs': { id: 'audit-logs', label: 'Audit Logs', description: 'System activity log with user and entity tracking', engine: () => import('./engines/audit-logs.js'), supportsSearch: true, supportsDateRange: true, exportable: true, },
    'college-performance': { id: 'college-performance', label: 'College Performance', description: 'Performance breakdown by college', engine: () => import('./engines/college-performance.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'course-analysis': { id: 'course-analysis', label: 'Course Analysis', description: 'Analysis of courses by pass rate and difficulty', engine: () => import('./engines/course-analysis.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'course-enrollment': { id: 'course-enrollment', label: 'Course Enrollment', description: 'Enrollment numbers per course', engine: () => import('./engines/course-enrollment.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'department-performance': { id: 'department-performance', label: 'Department Performance', description: 'Performance breakdown by department', engine: () => import('./engines/department-performance.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'exam-performance': { id: 'exam-performance', label: 'Exam Performance', description: 'Per-exam scores, pass rates and sessions', engine: () => import('./engines/exam-performance.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'exam-scheduling': { id: 'exam-scheduling', label: 'Exam Scheduling', description: 'Upcoming and past exam schedule with invigilators', engine: () => import('./engines/exam-scheduling.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'flagged-sessions': { id: 'flagged-sessions', label: 'Flagged Sessions', description: 'Exam sessions flagged or force-submitted', engine: () => import('./engines/flagged-sessions.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'invigilator-assignments': { id: 'invigilator-assignments', label: 'Invigilator Assignments', description: 'Invigilator workload and active session stats', engine: () => import('./engines/invigilator-assignments.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'lecturer-activity': { id: 'lecturer-activity', label: 'Lecturer Activity', description: 'Exams created and student outcomes per lecturer', engine: () => import('./engines/lecturer-activity.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'level-analysis': { id: 'level-analysis', label: 'Level Analysis', description: 'Performance and enrollment broken down by level', engine: () => import('./engines/level-analysis.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'login-history': { id: 'login-history', label: 'Login History', description: 'Auth session log with device and IP info', engine: () => import('./engines/login-history.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'notification-analytics': { id: 'notification-analytics', label: 'Notification Analytics', description: 'Notification send and read rate breakdown', engine: () => import('./engines/notification-analytics.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'overview': { id: 'overview', label: 'Overview', description: 'System-wide stats and recent activity', engine: () => import('./engines/overview.js'), supportsSearch: false, supportsDateRange: false, exportable: false },
    'pass-fail': { id: 'pass-fail', label: 'Pass / Fail', description: 'Pass and fail counts by department', engine: () => import('./engines/pass-fail.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'question-analysis': { id: 'question-analysis', label: 'Question Analysis', description: 'Per-question accuracy, difficulty and time stats', engine: () => import('./engines/question-analysis.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'registration-trends': { id: 'registration-trends', label: 'Registration Trends', description: 'New user and course registration trends over time', engine: () => import('./engines/registration-trends.js'), supportsSearch: false, supportsDateRange: true, exportable: true },
    'security-incidents': { id: 'security-incidents', label: 'Security Incidents', description: 'High-severity violations flagged during exams', engine: () => import('./engines/security-incidents.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'session-semester': { id: 'session-semester', label: 'Session / Semester', description: 'Exam and performance data grouped by session/semester', engine: () => import('./engines/session-semester.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'student-demographics': { id: 'student-demographics', label: 'Student Demographics', description: 'Student distribution by level, college and department', engine: () => import('./engines/student-demographics.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'student-performance': { id: 'student-performance', label: 'Student Performance', description: 'Per-student exam results and averages', engine: () => import('./engines/student-performance.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'suspended-users': { id: 'suspended-users', label: 'Suspended Users', description: 'Currently suspended accounts', engine: () => import('./engines/suspended-users.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'system-activity': { id: 'system-activity', label: 'System Activity', description: 'System-level audit log and health metrics', engine: () => import('./engines/system-activity.js'), supportsSearch: false, supportsDateRange: false, exportable: false },
    'time-score': { id: 'time-score', label: 'Time vs Score', description: 'Correlation between time taken and exam scores', engine: () => import('./engines/time-score.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'user-overview': { id: 'user-overview', label: 'User Overview', description: 'User counts and role distribution', engine: () => import('./engines/user-overview.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'violation-trends': { id: 'violation-trends', label: 'Violation Trends', description: 'Daily violation counts over the last 8 days', engine: () => import('./engines/violation-trends.js'), supportsSearch: false, supportsDateRange: false, exportable: true },
    'violations': { id: 'violations', label: 'Violations', description: 'All recorded exam violations with severity ratings', engine: () => import('./engines/violations.js'), supportsSearch: true, supportsDateRange: false, exportable: true },
    'action-analysis': { id: 'action-analysis', label: 'Action Analysis', description: 'Breakdown of actions taken in response to exam violations', engine: () => import('./engines/action-analysis.js'), supportsSearch: false, supportsDateRange: false, exportable: true, },
};

export function getReport(reportType: string): ReportMeta | null {
    return REPORT_REGISTRY[reportType] ?? null;
}

export function getAllReports(): ReportMeta[] {
    return Object.values(REPORT_REGISTRY);
}