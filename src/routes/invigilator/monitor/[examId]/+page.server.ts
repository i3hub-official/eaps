// src/routes/invigilator/monitor/[examId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  requireInvigilatorOrAdmin(locals.user);
  const prisma = await getPrismaClient();

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

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.courseId,
      session:  exam.session,
      semester: exam.semester,
    },
    include: {
      student: {
        select: {
          id:           true,
          fullName:     true,
          matricNumber: true,
          email:        true,
          photoUrl:     true,
          department: { select: { id: true, name: true, code: true } },
          level:      { select: { level: true, name: true } },
        },
      },
    },
  });

  const sessions = await prisma.examSession.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id:           true,
          fullName:     true,
          matricNumber: true,
          photoUrl:     true,
          department: { select: { name: true, code: true } },
        },
      },
      violations: {
        orderBy: { flaggedAt: 'desc' },
        take: 10,
      },
      examResult: {
        select: {
          score:       true,
          percentage:  true,
          passed:      true,
          grade:       true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sessionMap = new Map(sessions.map(s => [s.studentId, s]));

  const students = registrations.map(reg => {
    const session = sessionMap.get(reg.student.id);
    const result  = session?.examResult ?? null;

    return {
      studentId:         reg.student.id,
      fullName:          reg.student.fullName,
      matricNumber:      reg.student.matricNumber,
      email:             reg.student.email,
      photoUrl:          reg.student.photoUrl,
      department:        reg.student.department,
      level:             reg.student.level,
      registrationType:  reg.registrationType,
      sessionId:         session?.id             ?? null,
      status:            session?.status         ?? 'not_started',
      startedAt:         session?.startedAt      ?? null,
      submittedAt:       session?.submittedAt     ?? null,
      timeRemainingSecs: session?.timeRemainingSecs ?? null,
      violationCount:    session?.violationCount  ?? 0,
      // Prisma returns Decimal for score/percentage — convert to plain number
      // so SvelteKit can serialize them for the client.
      score:      result?.score      != null ? Number(result.score)      : null,
      percentage: result?.percentage != null ? Number(result.percentage) : null,
      passed:     result?.passed     ?? null,
      grade:      result?.grade      ?? null,
      resultSubmittedAt: result?.submittedAt ?? null,
    };
  });

  return { exam, students };
};