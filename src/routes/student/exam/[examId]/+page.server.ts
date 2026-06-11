// src/routes/student/exam/[examId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user   = requireStudent(locals.user);
  const examId = params.examId; // ← correct param name

  // ── 1. Face ENROLLMENT check (onboarding gate) ────────────────────────
  // Enrollment happens during registration — if missing, hard block.
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where:  { studentId: user.id },
    select: { studentId: true },
  });
  if (!faceDescriptor) {
    // Redirect to profile/enrollment page instead of a dead error
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

  // ── 4. Registration check (any type, any status) ──────────────────────
  // carry_over registrations are 'pending' — they must still be allowed in.
  // The check is: does a registration row exist at all?
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
  // Only block truly rejected registrations
  if (registration.status === 'rejected') {
    error(403, 'Your course registration was rejected. Contact your academic office.');
  }

  // ── 5. Existing session check ─────────────────────────────────────────
  const existingSession = await prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId: user.id } },
    select: { id: true, status: true },
  });

  // Already fully submitted → go to completion page
  if (
    existingSession?.status === 'submitted' ||
    existingSession?.status === 'force_submitted'
  ) {
    redirect(302, `/student/exam/${examId}/complete`);
  }

  // ── 6. Scheduled time check ───────────────────────────────────────────
  // Stored in DB as UTC — compare directly.
  const now = new Date();
  if (exam.scheduledStart && exam.scheduledStart > now) {
    error(403, 'This exam has not started yet.');
  }
  if (exam.scheduledEnd && exam.scheduledEnd < now) {
    error(403, 'This exam period has ended.');
  }

  // ── 7. Face VERIFICATION check (per-exam gate) ────────────────────────
  // Has the student successfully verified their face for THIS exam today?
  // We check for a successful log within the last 2 hours as the window.
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
    // These two flags drive what the Svelte lobby page shows
    faceVerified:       !!faceVerified,   // false → show FaceVerifyModal
    hasExistingSession: !!existingSession, // true → show "Resume" instead of "Start"
    registrationType:   registration.registrationType,
  };
};
