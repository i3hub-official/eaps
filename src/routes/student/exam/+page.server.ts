// src/routes/student/exam/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { findCurrentExamForStudent, getQuestionsByExam } from '$lib/server/db/exams.js';
import { getSessionAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { resolveExamSession } from '$lib/server/exam/session-engine.js';
import { toExamConfig, toSessionState, toClientQuestions, toAnswerInputs } from '$lib/server/exam/transform.js';
import type { ExamPayload } from '$lib/types/exam.js';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'student') throw error(403, 'Only students can take exams');

  const examId = event.url.searchParams.get('examId') ?? (await findCurrentExamForStudent(user));

  if (!examId) {
    throw redirect(303, '/student?notice=' + encodeURIComponent('No exam is currently available for you.'));
  }

  const access = await resolveExamSession(event, examId);

  if (!access.ok) {
    switch (access.reason) {
      case 'face_not_verified':
        throw redirect(
          303,
          `/verify?examId=${examId}&returnTo=${encodeURIComponent(`/student/exam?examId=${examId}`)}`
        );
      case 'already_submitted':
        throw redirect(303, `/student/results?examId=${examId}`);
      case 'time_up':
      case 'violation_limit':
        throw redirect(
          303,
          `/student/results?examId=${examId}&notice=${encodeURIComponent(access.message)}`
        );
      case 'flagged':
        throw redirect(303, '/student?notice=' + encodeURIComponent(access.message));
      default:
        throw error(access.status, access.message);
    }
  }

  const { exam, session, remaining, serverTime } = access;

  const allQuestions = await getQuestionsByExam(examId);
  const ordered = await buildStudentQuestionOrder(
    session.id,
    allQuestions,
    exam.randomizeQuestions,
    exam.randomizeOptions,
    exam.questionsToPresent
  );
  const safeQuestions = sanitizeQuestionsForClient(ordered);
  const savedAnswers = await getSessionAnswers(session.id);

   const prisma = await getPrismaClient();
  const faceRecord = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
    select: { descriptor: true },
  });
  const enrolledFaceDescriptor = Array.isArray(faceRecord?.descriptor)
    ? (faceRecord!.descriptor as number[])
    : null;

  const watermarkText = `${user.matricNumber ?? user.email} · ${exam.title}`;

  const payload: ExamPayload = {
    exam: toExamConfig(exam),
    session: toSessionState(session, remaining),
    questions: toClientQuestions(safeQuestions),
    savedAnswers: toAnswerInputs(savedAnswers),
    serverTime,
    watermarkText,
    enrolledFaceDescriptor,
  };


  return payload;
};