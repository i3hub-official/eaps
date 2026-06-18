// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
    select: { session: true, semester: true, id: true },
  });

  if (!activeSemester) {
    return {
      examCounts: { active: 0, scheduled: 0, completed: 0, cancelled: 0 },
      stats: { activeExams: 0, upcomingExams: 0, totalResults: 0, averageScore: 0 },
      recentResults: [],
      registeredCourses: [],
      activeSemester: null,
      performanceData: {
        grades: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        trend: [0],
        subjectPerformance: [{ subject: 'No Data', score: 0 }],
        improvement: 0
      }
    };
  }

  const courseRegistrationFilter = {
    session: activeSemester.session,
    semester: activeSemester.semester,
    course: {
      registrations: {
        some: {
          studentId: user.id,
          session: activeSemester.session,
          semester: activeSemester.semester,
          status: { in: ['pending', 'approved'] },
        },
      },
    },
  };

  const [
    examStatusCounts,
    recentResults,
    registeredCourses,
    resultStats,
    allResults,
  ] = await Promise.all([
    prisma.exam.groupBy({
      by: ['status'],
      where: {
        session: activeSemester.session,
        semester: activeSemester.semester,
        ...courseRegistrationFilter,
      },
      _count: { id: true },
    }),
    prisma.examResult.findMany({
      where: {
        studentId: user.id,
        exam: {
          session: activeSemester.session,
          semester: activeSemester.semester,
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        percentage: true,
        score: true,
        passed: true,
        grade: true,
        generatedAt: true,
        exam: {
          select: {
            title: true,
            course: { select: { code: true, level: true, title: true } },
          },
        },
      },
    }),
    prisma.courseRegistration.findMany({
      where: {
        studentId: user.id,
        session: activeSemester.session,
        semester: activeSemester.semester,
        status: { in: ['pending', 'approved'] },
      },
      select: {
        id: true,
        registrationType: true,
        status: true,
        session: true,
        semester: true,
        course: {
          select: {
            code: true,
            title: true,
            creditUnits: true,
            semester: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.examResult.aggregate({
      where: {
        studentId: user.id,
        exam: {
          session: activeSemester.session,
          semester: activeSemester.semester,
        },
      },
      _avg: { percentage: true },
      _count: { id: true },
    }),
    prisma.examResult.findMany({
      where: {
        studentId: user.id,
        exam: {
          session: activeSemester.session,
          semester: activeSemester.semester,
        },
      },
      select: {
        percentage: true,
        grade: true,
        exam: {
          select: {
            title: true,
            course: {
              select: {
                code: true,
                title: true,
              }
            }
          }
        }
      },
      orderBy: { generatedAt: 'asc' },
    }),
  ]);

  const statusMap = Object.fromEntries(
    examStatusCounts.map(r => [r.status, r._count.id])
  ) as Partial<Record<string, number>>;

  const examCounts = {
    active: statusMap['active'] ?? 0,
    scheduled: statusMap['scheduled'] ?? 0,
    completed: statusMap['completed'] ?? 0,
    cancelled: statusMap['cancelled'] ?? 0,
  };

  const performanceData = calculatePerformanceData(allResults);

  return {
    examCounts,
    stats: {
      activeExams: examCounts.active,
      upcomingExams: examCounts.scheduled,
      totalResults: resultStats._count.id,
      averageScore: Math.round(Number(resultStats._avg.percentage ?? 0)),
    },
    recentResults: recentResults.map(r => ({
      ...r,
      score: r.score ? Number(r.score) : null,
      percentage: r.percentage ? Number(r.percentage) : null,
    })),
    registeredCourses,
    activeSemester,
    performanceData,
    _debug: {
      studentId: user.id,
      studentLevel: user.level?.level,
      semester: `${activeSemester.session} - Semester ${activeSemester.semester}`,
      examCounts,
    },
  };
};

function calculatePerformanceData(results: any[]) {
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const subjectScores: { [key: string]: number[] } = {};
  const trend: number[] = [];

  results.forEach(result => {
    const pct = Number(result.percentage) || 0;
    const courseTitle = result.exam?.course?.title || result.exam?.course?.code || 'Unknown';

    if (pct >= 70) grades.A++;
    else if (pct >= 60) grades.B++;
    else if (pct >= 50) grades.C++;
    else if (pct >= 45) grades.D++;
    else grades.F++;

    if (!subjectScores[courseTitle]) {
      subjectScores[courseTitle] = [];
    }
    subjectScores[courseTitle].push(pct);
    trend.push(pct);
  });

  const subjectPerformance = Object.entries(subjectScores).map(([subject, scores]) => ({
    subject,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }));
  subjectPerformance.sort((a, b) => b.score - a.score);

  let improvement = 0;
  if (trend.length >= 4) {
    const midPoint = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, midPoint);
    const secondHalf = trend.slice(midPoint);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    improvement = Math.round((avgSecond - avgFirst) * 10) / 10;
  }

  const trendData = trend.length > 0 ? trend.slice(-7) : [0];
  while (trendData.length < 7) {
    trendData.unshift(0);
  }

  return {
    grades,
    trend: trendData,
    subjectPerformance: subjectPerformance.length > 0 ? subjectPerformance : [{ subject: 'No Data', score: 0 }],
    improvement
  };
}