// src/routes/student/exam/[examId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user   = requireStudent(locals.user);
  const examId = params.examId;

  // ── 1. Face ENROLLMENT check ────────────────────────────────────────────
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where:  { studentId: user.id },
    select: { studentId: true },
  });
  if (!faceDescriptor) {
    redirect(302, '/student/profile?enroll=1');
  }

  // ── 2. Fetch exam ─────────────────────────────────────────────────────
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: {
        select: {
          code: true, title: true, creditUnits: true,
          department: { select: { name: true } },
        },
      },
      questions: { select: { id: true } },
    },
  });
  if (!exam) error(404, 'Exam not found');

  // ── 3. Exam status check ──────────────────────────────────────────────
  if (exam.status === 'cancelled') error(410, 'This exam has been cancelled.');
  if (exam.status === 'completed') error(410, 'This exam has already ended.');
  if (exam.status !== 'active' && exam.status !== 'scheduled') {
    error(403, 'This exam is not currently available.');
  }

  // ── 4. Registration check ─────────────────────────────────────────────
  const registration = await prisma.courseRegistration.findFirst({
    where: {
      studentId: user.id,
      courseId:  exam.courseId,
      session:   exam.session,
      semester:  exam.semester,
    },
    select: { status: true, registrationType: true },
  });
  if (!registration) {
    error(403, 'You are not registered for this course.');
  }
  if (registration.status === 'rejected') {
    error(403, 'Your course registration was rejected. Contact your academic office.');
  }

  // ── 5. Existing session check ─────────────────────────────────────────
  const existingSession = await prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId: user.id } },
    select: { id: true, status: true },
  });

  if (
    existingSession?.status === 'submitted' ||
    existingSession?.status === 'force_submitted'
  ) {
    redirect(302, `/student/exam/${examId}/complete`);
  }

  // ── 6. Scheduled time check ───────────────────────────────────────────
  const now = new Date();
  if (exam.scheduledStart && exam.scheduledStart > now) {
    error(403, 'This exam has not started yet.');
  }
  if (exam.scheduledEnd && exam.scheduledEnd < now) {
    error(403, 'This exam period has ended.');
  }

  // ── 7. Face VERIFICATION check ─────────────────────────────────────────
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const faceVerified = await prisma.faceVerificationLog.findFirst({
    where: {
      studentId:  user.id,
      examId,
      success:    true,
      verifiedAt: { gte: twoHoursAgo },
    },
    select: { id: true },
  });

  // ── 8. Student data for identity confirmation ────────────────────────────
  const studentData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      matricNumber: true,
      email: true,
      department: { select: { name: true } },
      college: { select: { name: true } },
      level: { select: { level: true, name: true } },
      photoUrl: true,
    },
  });

  return {
    exam: {
      id:                 exam.id,
      title:              exam.title,
      courseCode:         exam.course.code,
      courseTitle:        exam.course.title,
      department:         exam.course.department?.name ?? '—',
      durationMinutes:    exam.durationMinutes,
      totalMarks:         exam.totalMarks,
      passMark:           exam.passMark,
      instructions:       exam.instructions,
      totalQuestions:     exam.questions.length,
      scheduledStart:     exam.scheduledStart,
      scheduledEnd:       exam.scheduledEnd,
      randomizeQuestions: exam.randomizeQuestions,
      questionsToPresent: exam.questionsToPresent,
      status:             exam.status,
      allowLateEntry:     exam.allowLateEntry,
      lateEntryMinutes:   exam.lateEntryMinutes,
    },
    faceVerified:       !!faceVerified,
    hasExistingSession: !!existingSession,
    registrationType:   registration.registrationType,
    student: {
      id:           studentData?.id ?? user.id,
      fullName:     studentData?.fullName ?? user.fullName,
      matricNumber: studentData?.matricNumber ?? null,
      email:        studentData?.email ?? user.email,
      department:   studentData?.department?.name ?? null,
      college:      studentData?.college?.name ?? null,
      level:        studentData?.level?.name ?? (studentData?.level?.level ? `${studentData.level.level} Level` : null),
      photoUrl:     studentData?.photoUrl ?? null,
    },
  };
};