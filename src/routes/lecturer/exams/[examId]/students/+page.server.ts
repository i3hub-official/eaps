// src/routes/lecturer/exams/[examId]/students/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
await requireLecturer(locals.user);

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    select: {
      id: true, title: true, createdBy: true, status: true,
      session: true, semester: true, levels: true,
      course: {
        select: {
          id: true, code: true, title: true,
          departmentId: true,
        },
      },
    },
  });

  if (!exam) error(404, 'Exam not found');
  if (exam.createdBy !== locals.user.id) error(403, 'Not your exam');

  // Enrolled students: registered for this course in this session/semester
  const enrollments = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.course.id,
      session:  exam.session,
      semester: exam.semester,
      ...(exam.levels.length > 0
        ? { student: { level: { in: exam.levels } } }
        : {}),
    },
    include: {
      student: {
        select: {
          id: true, title: true, fullName: true,
          matricNumber: true, level: true, photoUrl: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { student: { fullName: 'asc' } },
  });

  // Existing exam sessions for these students
  const studentIds = enrollments.map(e => e.student.id);
  const sessions = await prisma.examSession.findMany({
    where: { examId: params.examId, studentId: { in: studentIds } },
    select: {
      id: true, studentId: true, status: true,
      startedAt: true, submittedAt: true, violationCount: true,
      examResult: { select: { percentage: true, grade: true, passed: true } },
    },
  });

  const sessionMap = new Map(sessions.map(s => [s.studentId, s]));

  const students = enrollments.map(e => ({
    ...e.student,
    session: sessionMap.get(e.student.id) ?? null,
  }));

  // Counts
  const registered  = students.length;
  const started     = students.filter(s => s.session?.status === 'in_progress').length;
  const submitted   = students.filter(s =>
    s.session?.status === 'submitted' || s.session?.status === 'force_submitted'
  ).length;
  const notStarted  = students.filter(s => !s.session).length;
  const flagged     = students.filter(s => s.session?.status === 'flagged').length;

  return {
    exam,
    students,
    counts: { registered, started, submitted, notStarted, flagged },
  };
};