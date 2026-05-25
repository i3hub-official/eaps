// src/routes/(admin)/reports/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

// ── Types ──────────────────────────────────────────────────
type DateRange = '7d' | '14d' | '30d' | '90d' | 'all';

interface ExamStat {
  exam_title: string;
  course_code: string;
  total: number;
  submitted: number;
  passed: number;
  avg_pct: number;
  completion_rate: number;
  pass_rate: number;
}

interface TopStudent {
  student_name: string;
  matric_number: string | null;
  avg_pct: number;
  exams_taken: number;
  passed_count: number;
}

interface ViolationBreakdown {
  flag_type: string;
  count: number;
  pct_of_total: number;
}

interface DailyActivity {
  day: string;
  sessions: number;
  submissions: number;
  avg_score: number;
}

interface DashboardSummary {
  total_exams: number;
  total_sessions: number;
  total_submissions: number;
  overall_avg: number;
  total_violations: number;
  active_today: number;
}

interface CourseDistribution {
  course_code: string;
  exam_count: number;
  avg_score: number;
}

// ── Constants ────────────────────────────────────────────
const DATE_RANGES: Record<DateRange, string> = {
  '7d':  '7 days',
  '14d': '14 days',
  '30d': '30 days',
  '90d': '90 days',
  'all': '100 years',
};

const FLAG_LABELS: Record<string, string> = {
  tab_switch: 'Tab Switch',
  window_blur: 'Focus Lost',
  fullscreen_exit: 'Fullscreen Exit',
  copy_attempt: 'Copy Attempt',
  devtools_open: 'DevTools',
  screenshot_attempt: 'Screenshot',
  multiple_faces: 'Multiple Faces',
  no_face_detected: 'No Face',
  invigilator_manual: 'Manual Flag',
};

// ── Helpers ────────────────────────────────────────────────
function getIntervalDays(range: DateRange): number {
  const days = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90,
    'all': 36500,
  };
  return days[range] ?? 14;
}

function calculateRates(stats: ExamStat[]): void {
  for (const s of stats) {
    s.completion_rate = s.total > 0 ? Math.round((s.submitted / s.total) * 1000) / 10 : 0;
    s.pass_rate = s.submitted > 0 ? Math.round((s.passed / s.submitted) * 1000) / 10 : 0;
  }
}

function enrichViolations(violations: ViolationBreakdown[], total: number): void {
  for (const v of violations) {
    v.pct_of_total = total > 0 ? Math.round((v.count / total) * 1000) / 10 : 0;
  }
}

// ── Load ───────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
  const startTime = performance.now();
  requireAdmin(locals.user);

  // Parse query params
  const range = (url.searchParams.get('range') as DateRange) ?? '14d';
  const examLimit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
  const examOffset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);
  const intervalDays = getIntervalDays(range);

  try {
    const [
      examStats,
      topStudents,
      violationBreakdown,
      dailyActivity,
      summary,
      courseDistribution,
    ] = await Promise.all([
      // ── Per-exam summary with rates ─────────────────────
      sql<ExamStat>(
        `SELECT
           e.title AS exam_title,
           c.code AS course_code,
           COUNT(es.id)::int AS total,
           COUNT(es.id) FILTER (WHERE es.status IN ('submitted','force_submitted'))::int AS submitted,
           COUNT(er.id) FILTER (WHERE er.passed = true)::int AS passed,
           ROUND(COALESCE(AVG(er.percentage), 0)::numeric, 1) AS avg_pct,
           0::numeric AS completion_rate,
           0::numeric AS pass_rate
         FROM exams e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN exam_sessions es ON es.exam_id = e.id
         LEFT JOIN exam_results er ON er.session_id = es.id
         WHERE e.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY e.id, e.title, c.code
         ORDER BY e.created_at DESC
         LIMIT $2 OFFSET $3`,
        [intervalDays, examLimit, examOffset]
      ),

      // ── Top 10 students by avg score ────────────────────
      sql<TopStudent>(
        `SELECT
           u.full_name AS student_name,
           u.matric_number,
           ROUND(AVG(er.percentage)::numeric, 1) AS avg_pct,
           COUNT(er.id)::int AS exams_taken,
           COUNT(er.id) FILTER (WHERE er.passed = true)::int AS passed_count
         FROM exam_results er
         JOIN users u ON u.id = er.student_id
         JOIN exam_sessions es ON es.id = er.session_id
         WHERE es.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY u.id, u.full_name, u.matric_number
         HAVING COUNT(er.id) >= 1
         ORDER BY avg_pct DESC
         LIMIT 10`,
        [intervalDays]
      ),

      // ── Violation breakdown by type ───────────────────────
      sql<ViolationBreakdown>(
        `SELECT
           v.flag_type,
           COUNT(*)::int AS count,
           0::numeric AS pct_of_total
         FROM violations v
         JOIN exam_sessions es ON es.id = v.session_id
         WHERE es.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY v.flag_type
         ORDER BY count DESC`,
        [intervalDays]
      ),

      // ── Daily exam activity ─────────────────────────────
      sql<DailyActivity>(
        `SELECT
           DATE(es.created_at) AS day,
           COUNT(*)::int AS sessions,
           COUNT(*) FILTER (WHERE es.status IN ('submitted','force_submitted'))::int AS submissions,
           ROUND(COALESCE(AVG(er.percentage), 0)::numeric, 1) AS avg_score
         FROM exam_sessions es
         LEFT JOIN exam_results er ON er.session_id = es.id
         WHERE es.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY DATE(es.created_at)
         ORDER BY day ASC`,
        [intervalDays]
      ),

      // ── Dashboard summary (separate queries to avoid parameter issues) ──
      (async () => {
        const [totalExams, totalSessions, totalSubmissions, overallAvg, totalViolations, activeToday] = await Promise.all([
          sql<{ count: number }>(`SELECT COUNT(*)::int AS count FROM exams WHERE created_at >= NOW() - ($1 || ' days')::interval`, [intervalDays]),
          sql<{ count: number }>(`SELECT COUNT(*)::int AS count FROM exam_sessions WHERE created_at >= NOW() - ($1 || ' days')::interval`, [intervalDays]),
          sql<{ count: number }>(`SELECT COUNT(*)::int AS count FROM exam_sessions WHERE status IN ('submitted','force_submitted') AND created_at >= NOW() - ($1 || ' days')::interval`, [intervalDays]),
          sql<{ avg: number }>(`SELECT ROUND(COALESCE(AVG(er.percentage), 0)::numeric, 1) AS avg FROM exam_results er JOIN exam_sessions es ON es.id = er.session_id WHERE es.created_at >= NOW() - ($1 || ' days')::interval`, [intervalDays]),
          sql<{ count: number }>(`SELECT COUNT(*)::int AS count FROM violations v JOIN exam_sessions es ON es.id = v.session_id WHERE es.created_at >= NOW() - ($1 || ' days')::interval`, [intervalDays]),
          sql<{ count: number }>(`SELECT COUNT(*)::int AS count FROM exam_sessions WHERE created_at >= CURRENT_DATE AND status = 'in_progress'`, []),
        ]);
        
        return {
          total_exams: totalExams[0]?.count ?? 0,
          total_sessions: totalSessions[0]?.count ?? 0,
          total_submissions: totalSubmissions[0]?.count ?? 0,
          overall_avg: overallAvg[0]?.avg ?? 0,
          total_violations: totalViolations[0]?.count ?? 0,
          active_today: activeToday[0]?.count ?? 0,
        };
      })(),

      // ── Course distribution ────────────────────────────
      sql<CourseDistribution>(
        `SELECT
           c.code AS course_code,
           COUNT(DISTINCT e.id)::int AS exam_count,
           ROUND(COALESCE(AVG(er.percentage), 0)::numeric, 1) AS avg_score
         FROM courses c
         JOIN exams e ON e.course_id = c.id
         LEFT JOIN exam_sessions es ON es.exam_id = e.id
         LEFT JOIN exam_results er ON er.session_id = es.id
         WHERE e.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY c.id, c.code
         ORDER BY exam_count DESC
         LIMIT 8`,
        [intervalDays]
      ),
    ]);

    // Post-process computed fields
    calculateRates(examStats);
    const totalViolations = violationBreakdown.reduce((s, v) => s + v.count, 0);
    enrichViolations(violationBreakdown, totalViolations);

    const loadTime = Math.round(performance.now() - startTime);

    return {
      examStats,
      topStudents,
      violationBreakdown,
      dailyActivity,
      summary: summary || {
        total_exams: 0,
        total_sessions: 0,
        total_submissions: 0,
        overall_avg: 0,
        total_violations: 0,
        active_today: 0,
      },
      courseDistribution,
      flagLabels: FLAG_LABELS,
      meta: {
        range,
        examLimit,
        examOffset,
        totalViolations,
        loadTimeMs: loadTime,
        generatedAt: new Date().toISOString(),
      },
    };

  } catch (err) {
    console.error('[Reports Load Error]', err);
    return {
      examStats: [],
      topStudents: [],
      violationBreakdown: [],
      dailyActivity: [],
      summary: {
        total_exams: 0,
        total_sessions: 0,
        total_submissions: 0,
        overall_avg: 0,
        total_violations: 0,
        active_today: 0,
      },
      courseDistribution: [],
      flagLabels: FLAG_LABELS,
      meta: {
        range,
        examLimit,
        examOffset,
        totalViolations: 0,
        loadTimeMs: 0,
        generatedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
};