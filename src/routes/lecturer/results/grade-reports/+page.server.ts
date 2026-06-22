// src/routes/lecturer/results/grade-reports/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async (event) => {
  const user = requireLecturer(event.locals.user);
  const prisma = await getPrismaClient();

  // Get all results for exams the lecturer created
  const results = await prisma.examResult.findMany({
    where: {
      exam: {
        createdBy: user.id,
      },
    },
    include: {
      student: {
        select: {
          fullName: true,
          matricNumber: true,
          levelId: true,
        },
      },
      exam: {
        select: {
          title: true,
          courseId: true,
          session: true,
          course: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
  });

  // Transform data for the frontend
  const transformedResults = results.map(r => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.fullName,
    studentMatric: r.student.matricNumber,
    level: r.student.levelId,
    examId: r.examId,
    examTitle: r.exam.title,
    courseId: r.exam.courseId,
    courseCode: r.exam.course.code,
    courseTitle: r.exam.course.title,
    session: r.exam.session,
    score: r.score,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    violationCount: r.violationCount,
  }));

  // Get courses for filter dropdown
  const courses = await prisma.course.findMany({
    where: {
      lecturerAssignments: {
        some: { lecturerId: user.id }
      }
    },
    select: {
      id: true,
      code: true,
      title: true,
    },
    orderBy: { code: 'asc' },
  });

  // Get unique sessions
  const sessions = await prisma.exam.findMany({
    where: { createdBy: user.id },
    select: { session: true },
    distinct: ['session'],
    orderBy: { session: 'desc' },
  });

  // Get levels
  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    select: { level: true },
  });

  return {
    results: transformedResults,
    courses,
    sessions: sessions.map(s => s.session),
    levels: levels.map(l => l.level),
  };
};