import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user   = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  const activeSemester = await prisma.academicSemester.findFirst({
    where:  { isActive: true },
    select: { session: true, semester: true, id: true },
  });

  const emptyPerf = {
    grades:             { A: 0, B: 0, C: 0, D: 0, F: 0 },
    trend:              [0],
    trendLabels:        ['No Data'],
    subjectPerformance: [{ subject: 'No Data', score: 0 }],
    improvement:        0,
  };

  if (!activeSemester) {
    return {
      examCounts:        { active: 0, scheduled: 0, completed: 0, cancelled: 0 },
      stats:             { activeExams: 0, upcomingExams: 0, totalResults: 0, averageScore: 0 },
      recentResults:     [],
      registeredCourses: [],
      activeSemester:    null,
      performanceData:   emptyPerf,
    };
  }

  // ── Step 1: resolve student's registered courseIds ────────────────────────
  // groupBy does NOT support nested relation filters — resolve the IDs first.
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session:   activeSemester.session,
      semester:  activeSemester.semester,
      status:    { in: ['pending', 'approved'] },
    },
    select: { courseId: true },
  });
  const registeredCourseIds = registrations.map(r => r.courseId);

  // ── Step 2: find exams the student has already submitted ─────────────────
  // These must be excluded from the "active" count — a submitted exam is not
  // available to the student anymore even if its status is still 'active'.
  const submittedExamIds = await prisma.examSession.findMany({
    where: {
      studentId: user.id,
      status:    { in: ['submitted', 'force_submitted'] },
    },
    select: { examId: true },
  });
  const submittedSet = new Set(submittedExamIds.map(s => s.examId));

  // ── Step 3: parallel queries ──────────────────────────────────────────────
  const [
    allActiveExams,        // raw list so we can subtract submitted ones
    scheduledExams,        // count separately — simpler
    recentResults,
    registeredCourses,
    resultStats,
    allResults,
  ] = await Promise.all([

    // Active exams for this student's registered courses
    prisma.exam.findMany({
      where: {
        status:   'active',
        session:  activeSemester.session,
        semester: activeSemester.semester,
        courseId: { in: registeredCourseIds },
      },
      select: { id: true },
    }),

    // Scheduled exams count
    prisma.exam.count({
      where: {
        status:   'scheduled',
        session:  activeSemester.session,
        semester: activeSemester.semester,
        courseId: { in: registeredCourseIds },
      },
    }),

    // Recent results
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
            title:  true,
            course: { select: { code: true, level: true, title: true } },
          },
        },
      },
    }),

    // Registered courses for display
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

    // Result aggregate for average + total count
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

    // All results for performance chart (chronological)
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
            title:  true,
            course: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: { generatedAt: 'asc' },
    }),
  ]);

  // ── Active count: subtract already-submitted exams ────────────────────────
  const trueActiveCount = allActiveExams.filter(e => !submittedSet.has(e.id)).length;

  const examCounts = {
    active:    trueActiveCount,
    scheduled: scheduledExams,
    // 'completed' at exam level is lecturer-set — not meaningful for the student.
    // Use totalResults (student's own submitted exams) on the dashboard tile instead.
    completed: 0,
    cancelled: 0,
  };

  const performanceData = calculatePerformanceData(allResults);

  return {
    examCounts,
    stats: {
      activeExams:   trueActiveCount,
      upcomingExams: scheduledExams,
      totalResults:  resultStats._count.id,
      averageScore:  Math.round(Number(resultStats._avg.percentage ?? 0)),
    },
    recentResults: recentResults.map(r => ({
      ...r,
      score:      r.score      ? Number(r.score)      : null,
      percentage: r.percentage ? Number(r.percentage) : null,
    })),
    registeredCourses,
    activeSemester,
    performanceData,
  };
};

// ── Performance data helper ───────────────────────────────────────────────────
function calculatePerformanceData(results: Array<{
  percentage:  any;
  grade:       string | null;
  generatedAt: Date;
  exam: { title: string; course: { code: string; title: string } | null } | null;
}>) {
  const grades        = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const subjectScores: Record<string, number[]> = {};
  const trend:         number[] = [];
  const trendLabels:   string[] = [];

  for (const r of results) {
    const pct   = Number(r.percentage) || 0;
    const label = r.exam?.course?.code ?? r.exam?.course?.title ?? 'Unknown';
    const date  = new Date(r.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if      (pct >= 70) grades.A++;
    else if (pct >= 60) grades.B++;
    else if (pct >= 50) grades.C++;
    else if (pct >= 45) grades.D++;
    else                grades.F++;

    (subjectScores[label] ??= []).push(pct);
    trend.push(pct);
    trendLabels.push(date);
  }

  const subjectPerformance = Object.entries(subjectScores)
    .map(([subject, scores]) => ({
      subject,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.score - a.score);

  let improvement = 0;
  if (trend.length >= 4) {
    const mid      = Math.floor(trend.length / 2);
    const avgFirst = trend.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const avgLast  = trend.slice(mid).reduce((a, b) => a + b, 0) / (trend.length - mid);
    improvement    = Math.round((avgLast - avgFirst) * 10) / 10;
  }

  const trendSlice  = trend.length      > 0 ? trend.slice(-7)       : [0];
  const labelsSlice = trendLabels.length > 0 ? trendLabels.slice(-7) : ['No Data'];
  while (trendSlice.length  < 7) trendSlice.unshift(0);
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