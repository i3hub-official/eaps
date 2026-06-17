/**
 * src/routes/api/exam/[examId]/question/+server.ts
 *
 * GET ?index=N&sessionId=<uuid>
 *
 * Returns a single question for the authenticated student's session.
 * Never leaks correct answers or other students' questions.
 *
 * Response:
 * {
 *   index: number
 *   total: number
 *   question: {
 *     id: string
 *     type: 'mcq' | 'fill_in_the_blank'
 *     body: string
 *     imageUrl: string | null
 *     marks: number
 *     options: Array<{ id: string; text: string }>   ← shuffled, NO isCorrect
 *   }
 * }
 */

import { json, error }         from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { UUID_RE }             from '$lib/server/exam/session-engine.js';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const user    = await requireStudent(locals.user);
  const examId  = params.examId;

  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam ID');

  const rawIndex     = url.searchParams.get('index');
  const rawSessionId = url.searchParams.get('sessionId');

  if (rawIndex === null || rawSessionId === null) {
    throw error(400, 'index and sessionId are required');
  }

  const index     = parseInt(rawIndex, 10);
  const sessionId = rawSessionId;

  if (isNaN(index) || index < 0) throw error(400, 'Invalid index');
  if (!UUID_RE.test(sessionId))  throw error(400, 'Invalid sessionId');

  const prisma = await getPrismaClient();

  // ── Validate session ownership ─────────────────────────────────────────────
  const session = await prisma.examSession.findUnique({
    where:  { id: sessionId },
    select: { id: true, studentId: true, examId: true, status: true, startedAt: true },
  });

  if (!session)                         throw error(404, 'Session not found');
  if (session.studentId !== user.id)    throw error(403, 'Forbidden');
  if (session.examId    !== examId)     throw error(403, 'Forbidden');
  if (session.status === 'submitted' || session.status === 'force_submitted') {
    throw error(409, 'Exam already submitted');
  }
  if (session.status === 'flagged') throw error(423, 'Session paused');

  // ── Validate time ──────────────────────────────────────────────────────────
  if (session.startedAt) {
    const { computeDeadline, secondsRemaining, finalizeSession } =
      await import('$lib/server/exam/session-engine.js');
    const exam = await prisma.exam.findUnique({
      where: { id: examId }, select: { durationMinutes: true, scheduledEnd: true },
    });
    if (exam) {
      const deadline  = computeDeadline(exam as any, session.startedAt);
      const remaining = secondsRemaining(deadline);
      if (remaining <= 0 && session.status === 'in_progress') {
        await finalizeSession(session.id, 'force_submitted');
        throw error(409, 'Exam time has expired');
      }
    }
  }

  // ── Look up the question for this display index ────────────────────────────
  const orderRow = await prisma.sessionQuestionOrder.findFirst({
    where: { sessionId, displayIndex: index },
    select: { questionId: true },
  });

  if (!orderRow) throw error(404, `No question at index ${index}`);

  // ── Fetch question (NO isCorrect, NO accepted answers) ────────────────────
  const question = await prisma.question.findUnique({
    where:  { id: orderRow.questionId },
    select: {
      id:       true,
      type:     true,
      body:     true,
      imageUrl: true,
      marks:    true,
      options: {
        select: { id: true, optionText: true },
        // Do NOT select isCorrect
      },
      // Do NOT select fitbAnswers
    },
  });

  if (!question) throw error(404, 'Question data missing');

  // ── Fetch per-session option order (randomised shuffle) ───────────────────
  let orderedOptions: Array<{ id: string; text: string }> = [];

  if (question.type === 'mcq') {
    const optionOrder = await prisma.sessionOptionOrder.findMany({
      where:   { sessionId, questionId: orderRow.questionId },
      orderBy: { displayIndex: 'asc' },
      select:  { optionId: true, displayIndex: true },
    });

    // Map optionId → text
    const optionMap = new Map(question.options.map(o => [o.id, o.optionText]));

    orderedOptions = optionOrder
      .map(r => ({ id: r.optionId, text: optionMap.get(r.optionId) ?? '' }))
      .filter(o => o.text); // drop any orphaned rows

    // Fallback: if no session order rows exist yet (shouldn't happen), use DB order
    if (orderedOptions.length === 0) {
      orderedOptions = question.options.map(o => ({ id: o.id, text: o.optionText }));
    }
  }

  // ── Total questions for this session ──────────────────────────────────────
  const total = await prisma.sessionQuestionOrder.count({ where: { sessionId } });

  return json({
    index,
    total,
    question: {
      id:       question.id,
      type:     question.type,
      body:     question.body,
      imageUrl: question.imageUrl,
      marks:    question.marks,
      options:  orderedOptions,
    },
  });
};