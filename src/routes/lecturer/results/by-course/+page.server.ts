// src/routes/lecturer/results/by-course/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async (event) => {
 const user = await requireLecturer(event.locals.user);

  const prisma = await getPrismaClient();

  // Get all results for courses the lecturer teaches
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
    orderBy: {
      exam: {
        course: {
          code: 'asc',
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
    status: r.exam.status,
    scheduledStart: r.exam.scheduledStart,
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

  return {
    results: transformedResults,
    courses,
    sessions: sessions.map(s => s.session),
  };
};