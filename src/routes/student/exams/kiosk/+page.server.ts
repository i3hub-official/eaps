/**
 * src/routes/student/exams/kiosk/+page.server.ts
 *
 * Loads session metadata for the kiosk exam environment.
 * Face verification must already be complete (cookie set by verify API).
 *
 * Eligibility is checked manually here — we do NOT use isStudentEligible()
 * because that utility checks department and requires status='approved', which
 * rejects valid pending/carry_over registrations. The list page does the same.
 */

import { error, redirect }     from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { getExamForSession }   from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent } from '$lib/server/db/sessions.js';
import {
  computeDeadline,
  secondsRemaining,
  UUID_RE,
  finalizeSession,
} from '$lib/server/exam/session-engine.js';
import { toClientExam } from '$lib/server/exam/transform.js';
import { requireFaceVerified } from '$lib/server/auth/face-guard.js';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const user   = await requireStudent(locals.user);
  const examId = url.searchParams.get('examId');

  if (!examId || !UUID_RE.test(examId)) {
    throw redirect(302, '/student');
  }

  // ── Face verification gate ───────────────────────────────────────────────
  await requireFaceVerified(locals, cookies, examId);

  const prisma = await getPrismaClient();

  // ── Load exam ────────────────────────────────────────────────────────────
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Active semester ──────────────────────────────────────────────────────
  const activeSemester = await prisma.academicSemester.findFirst({
    where:  { isActive: true },
    select: { session: true, semester: true },
  });

  // ── Registration check ───────────────────────────────────────────────────
  // Allow pending + carry_over, just like the list page does.
  // Do NOT check department — registration already validates course ownership.
  const registration = await prisma.courseRegistration.findFirst({
    where: {
      studentId: user.id,
      courseId:  exam.courseId,
      ...(activeSemester ? {
        session:  activeSemester.session,
        semester: activeSemester.semester,
      } : {}),
      status: { notIn: ['rejected', 'withdrawn'] },
    },
    select: { id: true, registrationType: true },
  });
  if (!registration) throw error(403, 'You are not registered for this course.');

  // ── Level eligibility ────────────────────────────────────────────────────
  // Only check if the exam restricts to specific levels.
  if (exam.levels && exam.levels.length > 0) {
    const student = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { level: { select: { level: true } } },
    });
    const allowedLevels = exam.levels.map((l: { level: string }) => l.level);
    const studentLevel  = student?.level?.level;
    if (studentLevel && !allowedLevels.includes(studentLevel)) {
      throw error(403,
        `This exam requires level ${allowedLevels.join(' or ')} (you are ${studentLevel} Level).`
      );
    }
  }

  // ── Already submitted? ───────────────────────────────────────────────────
  const submitted = await prisma.examSession.findFirst({
    where: {
      studentId: user.id,
      examId,
      status: { in: ['submitted', 'force_submitted'] },
    },
    select: { id: true },
  });
  if (submitted) throw error(403, 'You have already submitted this exam.');

  // ── Student snapshot ─────────────────────────────────────────────────────
  const student = await prisma.user.findUnique({
    where:  { id: user.id },
    select: {
      id:           true,
      fullName:     true,
      email:        true,
      matricNumber: true,
      photoUrl:     true,
      department: { select: { name: true } },
      level:       { select: { level: true } },
    },
  });
  if (!student) throw error(404, 'Student record not found');

  // ── Face descriptor (for FaceMonitor) ───────────────────────────────────
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where:  { studentId: user.id },
    select: { descriptor: true },
  });

  // ── Session ──────────────────────────────────────────────────────────────
  const existingSession = await getSessionByExamAndStudent(examId, user.id);

  let sessionStatus: string    = existingSession?.status ?? 'not_started';
  let sessionId: string | null = existingSession?.id ?? null;
  let timeRemaining            = exam.durationMinutes * 60;
  let serverAnswerIndices: number[] = [];

  if (existingSession?.startedAt) {
    const deadline  = computeDeadline(exam, existingSession.startedAt);
    const remaining = secondsRemaining(deadline);

    if (remaining <= 0 && existingSession.status === 'in_progress') {
      await finalizeSession(existingSession.id, 'force_submitted');
      sessionStatus = 'force_submitted';
    } else {
      timeRemaining = Math.max(0, remaining);
    }

    if (
      existingSession.status === 'in_progress' ||
      existingSession.status === 'not_started'
    ) {
      const savedAnswerRows = await prisma.studentAnswer.findMany({
        where:  { sessionId: existingSession.id },
        select: { questionId: true },
      });
      if (savedAnswerRows.length > 0) {
        const savedQuestionIds = new Set(savedAnswerRows.map(r => r.questionId));
        const orderRows = await prisma.sessionQuestionOrder.findMany({
          where:  { sessionId: existingSession.id, questionId: { in: [...savedQuestionIds] } },
          select: { displayIndex: true },
        });
        serverAnswerIndices = orderRows.map(r => r.displayIndex);
      }
    }
  }

  let totalQuestions: number | null = null;
  if (existingSession) {
    totalQuestions = await prisma.sessionQuestionOrder.count({
      where: { sessionId: existingSession.id },
    });
    if (totalQuestions === 0) totalQuestions = null;
  }

  return {
    examId,
    exam:         toClientExam(exam),
    student: {
      id:           student.id,
      name:         student.fullName,
      email:        student.email,
      matricNumber: student.matricNumber,
      photoUrl:     student.photoUrl,
      department:   student.department?.name ?? null,
      level:        student.level?.level ? `${student.level.level} Level` : null,
    },
    faceDescriptor: faceDescriptor
      ? (faceDescriptor.descriptor as number[])
      : null,
    sessionStatus,
    sessionId,
    timeRemaining,
    totalQuestions,
    serverAnswerIndices,
  };
};