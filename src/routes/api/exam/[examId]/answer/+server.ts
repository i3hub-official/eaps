// src/routes/api/exam/[examId]/start/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getQuestionsByExam } from '$lib/server/db/exams.js';
import { getSessionAnswers } from '$lib/server/db/sessions.js';
import { buildStudentQuestionOrder, sanitizeQuestionsForClient } from '$lib/server/exam/randomizer.js';
import { resolveExamSession } from '$lib/server/exam/session-engine.js';
import { toClientExam, toClientSession, toClientQuestions, toSavedAnswers } from '$lib/server/exam/transform.js';
import type { ExamPayload } from '$lib/types/exam.js';

export const POST: RequestHandler = async (event) => {
  const { examId } = event.params;
  if (!examId) throw error(400, 'Invalid exam id');

  const access = await resolveExamSession(event, examId);
  if (!access.ok) throw error(access.status, access.message);

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

  const payload: ExamPayload & { server_time: Date } = {
    exam: toClientExam(exam),
    session: toClientSession(session, remaining),
    questions: toClientQuestions(safeQuestions),
    saved_answers: toSavedAnswers(savedAnswers),
    server_time: serverTime,
  };

  return json(payload);
};