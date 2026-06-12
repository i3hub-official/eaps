// src/routes/student/exam/[examId]/session/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { getSessionAnswers } from '$lib/server/db/sessions.js';
import { getFaceDescriptor } from '$lib/server/db/faces.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, '/login');
  if (locals.user.role !== 'student') redirect(302, '/');

  const { examId } = params;

  // ── Load session ──────────────────────────────────────────────────────────
  const session = await prisma.examSession.findFirst({
    where: {
      examId,
      studentId: locals.user.id,
      status:    { in: ['in_progress', 'not_started'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    redirect(302, `/student/exam/${examId}`);
  }

  // If somehow still not_started, start it now
  if (session.status === 'not_started') {
    await prisma.examSession.update({
      where: { id: session.id },
      data:  { status: 'in_progress', startedAt: new Date() },
    });
  }

  // ── Load exam ─────────────────────────────────────────────────────────────
  const exam = await prisma.exam.findUnique({
    where:  { id: examId },
    select: {
      id:                  true,
      title:               true,
      durationMinutes:     true,
      maxViolations:       true,
      questionsToPresent:  true,
      randomizeQuestions:  true,
      randomizeOptions:    true,
      showResultAfter:     true,
      course: { select: { code: true, title: true } },
    },
  });

  if (!exam) error(404, 'Exam not found');

  // ── Load questions ────────────────────────────────────────────────────────
  const allQuestions = await prisma.question.findMany({
    where:   { examId },
    include: {
      options:     { orderBy: { orderIndex: 'asc' } },
      fitbAnswers: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  // ── Apply randomization ─
  const orderedQuestions = await buildStudentQuestionOrder(
    session.id,
    allQuestions,
    exam.randomizeQuestions,
    exam.randomizeOptions,
    exam.questionsToPresent,
  );

  const questions = sanitizeQuestionsForClient(orderedQuestions);

  // ── Load saved answers ────────────────────────────────────────────────────
  const savedAnswers = await getSessionAnswers(session.id);
  const answersMap: Record<string, { selectedOption: string | null; textAnswer: string | null }> = {};
  for (const a of savedAnswers) {
    answersMap[a.questionId] = {
      selectedOption: a.selectedOption,
      textAnswer:     a.textAnswer,
    };
  }

  // ── Enrolled face descriptor ────────────────────────────────────────────
  const enrolledDescriptor = await getFaceDescriptor(locals.user.id);

  // ── Compute time remaining ────────────────────────────────────────────────
  const totalSecs = exam.durationMinutes * 60;
  let timeRemainingSecs: number;

  if (session.timeRemainingSecs !== null) {
    timeRemainingSecs = session.timeRemainingSecs;
  } else if (session.startedAt) {
    const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    timeRemainingSecs = Math.max(0, totalSecs - elapsed);
  } else {
    timeRemainingSecs = totalSecs;
  }

  return {
    session: {
      id:              session.id,
      status:          session.status,
      violationCount:  session.violationCount,
      timeRemainingSecs,
    },
    exam: {
      id:                    exam.id,
      title:                 exam.title,
      courseCode:            exam.course.code,
      courseTitle:           exam.course.title,
      durationMinutes:       exam.durationMinutes,
      maxViolations:         exam.maxViolations,
      showResultAfter:        exam.showResultAfter,
    },
    questions,
    answersMap,
    enrolledDescriptor,
    student: {
      id:       locals.user.id,
      fullName: locals.user.fullName,
    },
  };
};