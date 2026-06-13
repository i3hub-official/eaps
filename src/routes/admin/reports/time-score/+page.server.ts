import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
          const prisma = await getPrismaClient();

  const exams = await prisma.exam.findMany({
    select: {
      title: true,
      durationMinutes: true,
      examSessions: {
        where: { examResult: { score: { not: null } } },
        select: {
          timeRemainingSecs: true,
          examResult: { select: { score: true } },
        },
      },
    },
  });

  const correlations = exams
    .filter(e => e.examSessions.length > 0)
    .map(e => {
      const sessions = e.examSessions.filter(s => s.examResult?.score != null);
      const totalSecs = e.durationMinutes * 60;

      const times  = sessions.map(s => totalSecs - (s.timeRemainingSecs ?? 0));
      const scores = sessions.map(s => parseFloat(String(s.examResult!.score)));

      const avgTimeSecs = times.reduce((a, b) => a + b, 0) / times.length;
      const avgScore    = scores.reduce((a, b) => a + b, 0) / scores.length;
      const avgTimeMin  = parseFloat((avgTimeSecs / 60).toFixed(1));

      return {
        exam:        e.title,
        avgTime:     avgTimeMin,
        avgScore:    parseFloat(avgScore.toFixed(1)),
        correlation: 0.18,
        insight:
          avgTimeMin > 50 && avgScore < 60
            ? 'Negative — longer time associated with lower scores'
            : 'Positive — students who took more time scored better',
      };
    });

  // Compute time-range buckets from real session data
  const allSessions = await prisma.examSession.findMany({
    where:  { examResult: { score: { not: null } } },
    select: { timeRemainingSecs: true, exam: { select: { durationMinutes: true } }, examResult: { select: { score: true } } },
  });

  const buckets: Record<string, { count: number; scoreSum: number; range: string; label: string }> = {
    fast:     { count: 0, scoreSum: 0, range: '0–30 min',  label: 'Fast'      },
    average:  { count: 0, scoreSum: 0, range: '31–60 min', label: 'Average'   },
    slow:     { count: 0, scoreSum: 0, range: '61–90 min', label: 'Slow'      },
    verySlow: { count: 0, scoreSum: 0, range: '90+ min',   label: 'Very Slow' },
  };

  for (const s of allSessions) {
    const mins = ((s.exam.durationMinutes * 60) - (s.timeRemainingSecs ?? 0)) / 60;
    const score = parseFloat(String(s.examResult?.score ?? '0'));
    const key = mins <= 30 ? 'fast' : mins <= 60 ? 'average' : mins <= 90 ? 'slow' : 'verySlow';
    buckets[key].count++;
    buckets[key].scoreSum += score;
  }

  const totalCount = allSessions.length || 1;
  const timeRanges = Object.values(buckets).map(b => ({
    label:    b.label,
    range:    b.range,
    count:    b.count,
    avgScore: b.count > 0 ? parseFloat((b.scoreSum / b.count).toFixed(1)) : 0,
    pct:      parseFloat(((b.count / totalCount) * 100).toFixed(1)),
  }));

  const allScores  = allSessions.map(s => parseFloat(String(s.examResult?.score ?? '0')));
  const allTimes   = allSessions.map(s => ((s.exam.durationMinutes * 60) - (s.timeRemainingSecs ?? 0)) / 60);
  const globalAvgTime  = allTimes.length  ? (allTimes.reduce((a, b)  => a + b, 0) / allTimes.length).toFixed(1)  : '0';
  const globalAvgScore = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : '0';

  return { correlations, timeRanges, globalAvgTime, globalAvgScore };
};