// src/routes/invigilator/monitor/[examId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  requireInvigilatorOrAdmin(locals.user);

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { select: { id: true, code: true, title: true, creditUnits: true } },
      invigilators: { where: { invigilatorId: locals.user!.id } },
    },
  });

  if (!exam) error(404, 'Exam not found');
  if (exam.invigilators.length === 0 && locals.user!.role !== 'admin') {
    error(403, 'You are not assigned to invigilate this exam');
  }

  // Get ALL students registered for this course in the current session/semester
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.courseId,
      session: exam.session,
      semester: exam.semester,
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          matricNumber: true,
          email: true,
          photoUrl: true,
          department: { select: { id: true, name: true, code: true } },
          level: { select: { level: true, name: true } },
        },
      },
    },
  });

  // Get exam sessions for this exam (students who actually started/attempted)
  const sessions = await prisma.examSession.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          matricNumber: true,
          photoUrl: true,
          department: { select: { name: true, code: true } },
        },
      },
      violations: {
        orderBy: { flaggedAt: 'desc' },
        take: 10,
      },
      examResult: {
        select: {
          score: true,
          percentage: true,
          passed: true,
          grade: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Build a map of studentId -> session for quick lookup
  const sessionMap = new Map(sessions.map(s => [s.studentId, s]));

  // Merge registrations with session data
  const students = registrations.map(reg => {
    const session = sessionMap.get(reg.student.id);
    return {
      studentId: reg.student.id,
      fullName: reg.student.fullName,
      matricNumber: reg.student.matricNumber,
      email: reg.student.email,
      photoUrl: reg.student.photoUrl,
      department: reg.student.department,
      level: reg.student.level,
      registrationType: reg.registrationType,
      // Session data (if they took the exam)
      sessionId: session?.id ?? null,
      status: session?.status ?? 'not_started',
      startedAt: session?.startedAt ?? null,
      submittedAt: session?.submittedAt ?? null,
      timeRemainingSecs: session?.timeRemainingSecs ?? null,
      violationCount: session?.violationCount ?? 0,
      score: session?.examResult?.score ?? null,
      percentage: session?.examResult?.percentage ?? null,
      passed: session?.examResult?.passed ?? null,
      grade: session?.examResult?.grade ?? null,
      resultSubmittedAt: session?.examResult?.submittedAt ?? null,
    };
  });

  return { exam, students };
};