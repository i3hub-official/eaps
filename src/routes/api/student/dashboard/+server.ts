// src/routes/api/student/dashboard/+server.ts
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user   = await requireStudent(locals.user);
    const prisma = await getPrismaClient();

    const activeSemester = await prisma.academicSemester.findFirst({
      where:  { isActive: true },
      select: { session: true, semester: true, id: true },
    });

    if (!activeSemester) {
      return json({
        examCounts:      { active: 0, scheduled: 0, completed: 0, cancelled: 0 },
        stats:           { activeExams: 0, upcomingExams: 0, totalResults: 0, averageScore: 0 },
        recentResults:   [],
        registeredCourses: [],
        performanceData: {
          grades: { A: 0, B: 0, C: 0, D: 0, F: 0 },
          trend:       [0],
          trendLabels: ['No Data'],
          subjectPerformance: [{ subject: 'No Data', score: 0 }],
          improvement: 0,
        },
        timestamp: Date.now(),
      });
    }

    // ── Resolve registered courseIds first (same fix as page.server.ts) ────
    const studentRegistrations = await prisma.courseRegistration.findMany({
      where: {
        studentId: user.id,
        session:   activeSemester.session,
        semester:  activeSemester.semester,
        status:    { in: ['pending', 'approved'] },
      },
      select: { courseId: true },
    });
    const registeredCourseIds = studentRegistrations.map(r => r.courseId);

    const [examStatusCounts, recentResults, registeredCourses, resultStats, allResults] =
      await Promise.all([
        prisma.exam.groupBy({
          by: ['status'],
          where: {
            session:  activeSemester.session,
            semester: activeSemester.semester,
            courseId: { in: registeredCourseIds },
          },
          _count: { id: true },
        }),

        prisma.examResult.findMany({
          where: {
            studentId: user.id,
            exam: {
              session:  activeSemester.session,
              semester: activeSemester.semester,
            },
          },
          orderBy: { generatedAt: 'desc' },
          take: 5,
          select: {
            id:          true,
            percentage:  true,
            score:       true,
            passed:      true,
            grade:       true,
            generatedAt: true,
            exam: {
              select: {
                title: true,
                course: { select: { code: true, level: true, title: true } },
              },
            },
          },
        }),

        // Include registeredCourses so the polling merge keeps it fresh
        prisma.courseRegistration.findMany({
          where: {
            studentId: user.id,
            session:   activeSemester.session,
            semester:  activeSemester.semester,
            status:    { in: ['pending', 'approved'] },
          },
          select: {
            id:               true,
            registrationType: true,
            status:           true,
            session:          true,
            semester:         true,
            course: {
              select: {
                code:        true,
                title:       true,
                creditUnits: true,
                semester:    true,
                level:       true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),

        prisma.examResult.aggregate({
          where: {
            studentId: user.id,
            exam: {
              session:  activeSemester.session,
              semester: activeSemester.semester,
            },
          },
          _avg:   { percentage: true },
          _count: { id: true },
        }),

        prisma.examResult.findMany({
          where: {
            studentId: user.id,
            exam: {
              session:  activeSemester.session,
              semester: activeSemester.semester,
            },
          },
          select: {
            percentage:  true,
            grade:       true,
            generatedAt: true,
            exam: {
              select: {
                title: true,
                course: { select: { code: true, title: true } },
              },
            },
          },
          orderBy: { generatedAt: 'asc' },
        }),
      ]);

    const statusMap = Object.fromEntries(
      examStatusCounts.map(r => [r.status, r._count.id])
    ) as Partial<Record<string, number>>;

    const examCounts = {
      active:    statusMap['active']    ?? 0,
      scheduled: statusMap['scheduled'] ?? 0,
      completed: statusMap['completed'] ?? 0,
      cancelled: statusMap['cancelled'] ?? 0,
    };

    const performanceData = calculatePerformanceData(allResults);

    return json({
      examCounts,
      stats: {
        activeExams:   examCounts.active,
        upcomingExams: examCounts.scheduled,
        totalResults:  resultStats._count.id,
        averageScore:  Math.round(Number(resultStats._avg.percentage ?? 0)),
      },
      recentResults: recentResults.map(r => ({
        ...r,
        score:      r.score      ? Number(r.score)      : null,
        percentage: r.percentage ? Number(r.percentage) : null,
      })),
      registeredCourses,
      performanceData,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch dashboard data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ── Shared helper ────────────────────────────────────────────────────────────
function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function calculatePerformanceData(results: Array<{
  percentage:  any;
  grade:       string | null;
  generatedAt: Date;
  exam: { title: string; course: { code: string; title: string } | null } | null;
}>) {
  const grades        = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const subjectScores: Record<string, number[]> = {};
  const trend:        number[] = [];
  const trendLabels:  string[] = [];

  for (const result of results) {
    const pct         = Number(result.percentage) || 0;
    const courseLabel = result.exam?.course?.code ?? result.exam?.course?.title ?? 'Unknown';
    const dateLabel   = new Date(result.generatedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });

    if (pct >= 70)      grades.A++;
    else if (pct >= 60) grades.B++;
    else if (pct >= 50) grades.C++;
    else if (pct >= 45) grades.D++;
    else                grades.F++;

    subjectScores[courseLabel] ??= [];
    subjectScores[courseLabel].push(pct);

    trend.push(pct);
    trendLabels.push(dateLabel);
  }

  const subjectPerformance = Object.entries(subjectScores)
    .map(([subject, scores]) => ({
      subject,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.score - a.score);

  let improvement = 0;
  if (trend.length >= 4) {
    const mid       = Math.floor(trend.length / 2);
    const avgFirst  = trend.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const avgSecond = trend.slice(mid).reduce((a, b) => a + b, 0) / (trend.length - mid);
    improvement     = Math.round((avgSecond - avgFirst) * 10) / 10;
  }

  const trendSlice  = trend.length > 0       ? trend.slice(-7)       : [0];
  const labelsSlice = trendLabels.length > 0 ? trendLabels.slice(-7) : ['No Data'];
  while (trendSlice.length < 7)  trendSlice.unshift(0);
  while (labelsSlice.length < 7) labelsSlice.unshift('—');

  return {
    grades,
    trend:       trendSlice,
    trendLabels: labelsSlice,
    subjectPerformance: subjectPerformance.length > 0
      ? subjectPerformance
      : [{ subject: 'No Data', score: 0 }],
    improvement,
  };
}