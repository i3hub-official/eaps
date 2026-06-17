/**
 * src/routes/student/exams/kiosk/+page.server.ts
 *
 * Loads session metadata for the detached kiosk exam window.
 * Face verification must already be complete (done in the portal window).
 * Redirects back to the exam flow page if verification cookie is missing.
 */

import { error, redirect }     from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { getExamForSession, isStudentEligible } from '$lib/server/db/exams.js';
import { getSessionByExamAndStudent }           from '$lib/server/db/sessions.js';
import {
  computeDeadline,
  secondsRemaining,
  UUID_RE,
  finalizeSession,
} from '$lib/server/exam/session-engine.js';
import { toClientExam } from '$lib/server/exam/transform.js';

import { requireFaceVerified } from '$lib/server/auth/face-guard.js';


export const load: PageServerLoad = async ({ locals, url, cookies }) => {

console.log('=== KIOSK LOAD ===');
  console.log('examId:', url.searchParams.get('examId'));
  console.log('face_verified cookie:', cookies.get('face_verified'));
  console.log('face_verified_at cookie:', cookies.get('face_verified_at'));
  console.log('user:', locals.user?.id);

  const user   = await requireStudent(locals.user);
  const examId = url.searchParams.get('examId');

  if (!examId || !UUID_RE.test(examId)) {
    throw redirect(302, '/student');
  }

await requireFaceVerified(locals, cookies, examId);


  const prisma = await getPrismaClient();

  // ── Load exam ────────────────────────────────────────────────────────────
  const exam = await getExamForSession(examId);
  if (!exam) throw error(404, 'Exam not found');

  // ── Registration check ───────────────────────────────────────────────────
  const registered = await prisma.courseRegistration.findFirst({
    where:  { studentId: user.id, courseId: exam.courseId },
    select: { id: true },
  });
  if (!registered) throw error(403, 'You are not registered for this course.');

  // ── Eligibility ──────────────────────────────────────────────────────────
  const eligibility = isStudentEligible(exam, user);
  if (!eligibility.eligible) throw error(403, eligibility.reason ?? 'Not eligible.');

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

  // ── Existing session ─────────────────────────────────────────────────────
  const existingSession = await getSessionByExamAndStudent(examId, user.id);

  let sessionStatus: string = existingSession?.status ?? 'not_started';
  let sessionId: string | null = existingSession?.id ?? null;
  let timeRemaining = exam.durationMinutes * 60;
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

    if (existingSession.status === 'in_progress' || existingSession.status === 'not_started') {
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