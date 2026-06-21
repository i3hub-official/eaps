// src/routes/lecturer/results/by-exam/+page.server.ts
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
        },
      },
      exam: {
        select: {
          title: true,
          courseId: true,
          status: true,
          scheduledStart: true,
          course: {
            select: {
              code: true,
            },
          },
        },
      },
    },
    orderBy: {
      exam: {
        scheduledStart: 'desc',
      },
    },
  });

  // Transform data for the frontend
  const transformedResults = results.map(r => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.fullName,
    studentMatric: r.student.matricNumber,
    examId: r.examId,
    examTitle: r.exam.title,
    courseCode: r.exam.course.code,
    score: r.score,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    violationCount: r.violationCount,
    status: r.exam.status,
    scheduledStart: r.exam.scheduledStart,
  }));

  // Get exams for filter dropdown
  const exams = await prisma.exam.findMany({
    where: { createdBy: user.id },
    select: {
      id: true,
      title: true,
      course: {
        select: { code: true },
      },
    },
    orderBy: { scheduledStart: 'desc' },
  });

  return {
    results: transformedResults,
    exams: exams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
    })),
  };
};