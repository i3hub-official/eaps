// src/routes/lecturer/results/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async (event) => {
     const user = await requireLecturer(event.locals.user);
   const prisma = await getPrismaClient();

  const [courses, exams, results] = await Promise.all([
    // Courses with aggregated stats
    prisma.course.findMany({
      where: { lecturerAssignments: { some: { lecturerId: user.id } } },
      select: {
        id: true, code: true, title: true,
        _count: { select: { registrations: true } },
        exams: {
          where: { status: { in: ['completed', 'active'] } },
          select: {
            examResults: { select: { score: true, passed: true } },
          },
        },
      },
    }),
    // Exams with stats
    prisma.exam.findMany({
      where: { createdBy: user.id },
      select: {
        id: true, title: true, status: true,
        scheduledStart: true, createdAt: true,
        course: { select: { code: true, title: true } },
        _count: { select: { examSessions: true } },
        examResults: { select: { score: true, passed: true } },
      },
      orderBy: { scheduledStart: 'desc' },
    }),
    // Raw results for grade reports
    prisma.examResult.findMany({
      where: { exam: { createdBy: user.id } },
      select: {
        score: true, passed: true, grade: true,
        student: { select: { id: true, fullName: true, matricNumber: true } },
        exam: { select: { id: true, course: { select: { code: true } } } },
      },
    }),
  ]);

  // Compute course aggregates
  const coursesWithStats = courses.map(c => {
    const allResults = c.exams.flatMap(e => e.examResults);
    const scores = allResults.map(r => Number(r.score || 0)).filter(s => s > 0);
    const passed = allResults.filter(r => r.passed).length;
    return {
      id: c.id, code: c.code, title: c.title,
      color: `hsl(${Math.abs(c.code.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 65%, 45%)`,
      studentCount: c._count.registrations,
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: allResults.length ? Math.round((passed / allResults.length) * 100) : 0,
      topGrade: computeTopGrade(allResults),
    };
  });

  // Compute exam aggregates
  const examsWithStats = exams.map(e => {
    const scores = e.examResults.map(r => Number(r.score || 0)).filter(s => s > 0);
    const passed = e.examResults.filter(r => r.passed).length;
    return {
      id: e.id, title: e.title, status: e.status,
      scheduledStart: e.scheduledStart?.toISOString() ?? e.createdAt.toISOString(),
      courseCode: e.course.code, courseTitle: e.course.title,
      participantCount: e._count.examSessions,
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: e.examResults.length ? Math.round((passed / e.examResults.length) * 100) : 0,
      highestScore: scores.length ? Math.max(...scores) : null,
    };
  });

  // Compute grade report data
  const gradeMap: Record<string, { count: number; totalScore: number; passed: number }> = {};
  results.forEach(r => {
    const g = r.grade || 'F';
    if (!gradeMap[g]) gradeMap[g] = { count: 0, totalScore: 0, passed: 0 };
    gradeMap[g].count++;
    gradeMap[g].totalScore += Number(r.score || 0);
    if (r.passed) gradeMap[g].passed++;
  });

  const distribution = Object.entries(gradeMap).map(([grade, d]) => ({
    grade, count: d.count,
    avgScore: Math.round(d.totalScore / d.count),
    passRate: Math.round((d.passed / d.count) * 100),
  }));

  const sortedByScore = [...results].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const topPerformers = sortedByScore.slice(0, 10).map(r => ({
    id: r.student.id, name: r.student.fullName,
    matricNumber: r.student.matricNumber,
    courseCode: r.exam.course.code,
    score: Number(r.score || 0),
  }));
  const atRisk = sortedByScore.filter(r => Number(r.score || 0) < 45).slice(0, 10).map(r => ({
    id: r.student.id, name: r.student.fullName,
    matricNumber: r.student.matricNumber,
    courseCode: r.exam.course.code,
    score: Number(r.score || 0),
  }));

  return {
    courses: coursesWithStats,
    exams: examsWithStats,
    report: { distribution, topPerformers, atRisk },
  };
};

function computeTopGrade(results: { score: string | null }[]): string | null {
  const grades = results.map(r => {
    const s = Number(r.score);
    if (s >= 70) return 'A'; if (s >= 60) return 'B'; if (s >= 50) return 'C';
    if (s >= 45) return 'D'; if (s >= 40) return 'E'; return 'F';
  });
  const counts = grades.reduce((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc; }, {} as Record<string, number>);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}