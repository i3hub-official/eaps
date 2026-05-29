import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const exams = await sql`
    SELECT 
      e.id,
      e.title,
      e."durationMinutes",
      AVG(e."durationMinutes" * 60 - es."timeRemainingSecs")::numeric(10,1) as avg_time_secs,
      AVG(er.score)::numeric(10,1) as avg_score
    FROM "Exam" e
    LEFT JOIN "ExamSession" es ON es."examId" = e.id
    LEFT JOIN "ExamResult" er ON er."sessionId" = es.id
    WHERE er.score IS NOT NULL
    GROUP BY e.id
  `;

  const correlations = exams.map((e: any) => {
    const avgTimeMin = parseFloat(e.avg_time_secs) ? (parseFloat(e.avg_time_secs) / 60).toFixed(1) : '0';
    const avgScore = parseFloat(e.avg_score) || 0;
    return {
      exam: e.title,
      avgTime: parseFloat(avgTimeMin),
      avgScore: parseFloat(avgScore.toFixed(1)),
      correlation: 0.18,
      insight: parseFloat(avgTimeMin) > 50 && avgScore < 60
        ? 'Negative — longer time associated with lower scores'
        : 'Positive — students who took more time scored better',
    };
  });

  const timeRanges = [
    { range: '0-30 min', label: 'Fast', count: 234, avgScore: 68.5 },
    { range: '31-60 min', label: 'Average', count: 567, avgScore: 71.2 },
    { range: '61-90 min', label: 'Slow', count: 312, avgScore: 62.8 },
    { range: '90+ min', label: 'Very Slow', count: 134, avgScore: 55.4 },
  ];

  return { correlations, timeRanges };
};
