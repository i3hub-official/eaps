// src/routes/lecturer/exams/[examId]/questions/+page.server.ts

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamForLecturer } from '$lib/server/db/exams.js';
import { UUID_RE } from '$lib/server/exam/session-engine.js';

type ActionEvent = {
  locals: App.Locals;
  params: { examId?: string };
  request: Request;
};

async function loadOwnedExam(event: ActionEvent) {
const user = await requireLecturer(event.locals.user);

  const { examId } = event.params;
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const exam = await getExamForLecturer(examId, user.id);
  if (!exam) throw error(404, 'Exam not found');

  return { exam, user };
}

export const load: PageServerLoad = async (event) => {
   await requireLecturer(event.locals.user);
  const { exam } = await loadOwnedExam(event);
  const prisma = await getPrismaClient();

  const fullExam = await prisma.exam.findUnique({
    where: { id: exam.id },
    include: {
      course: { select: { code: true, title: true } },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options:      { orderBy: { orderIndex: 'asc' } },
          fitbAnswers:  true,
        },
      },
    },
  });

  if (!fullExam) throw error(404, 'Exam not found');
  return { exam: fullExam };
};

// ── Shared question action helpers ────────────────────────────────────────────

async function requireEditable(event: ActionEvent) {
  const { exam } = await loadOwnedExam(event);
  if (exam.status === 'active' || exam.status === 'completed' || exam.status === 'cancelled') {
    throw fail(400, { error: `Cannot edit questions on a ${exam.status} exam.` });
  }
  return exam;
}

export const actions: Actions = {

  add_mcq: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const body = fd.get('body')?.toString().trim() ?? '';
    const topic = fd.get('topic')?.toString().trim() || null;
    const marks = parseInt(fd.get('marks')?.toString() ?? '1') || 1;
    const correctIndex = parseInt(fd.get('correctOption')?.toString() ?? '0');

    if (!body) return fail(400, { error: 'Question body is required.' });

    const options: { text: string; correct: boolean }[] = [];
    for (let i = 0; fd.has(`option_${i}`); i++) {
      const text = fd.get(`option_${i}`)?.toString().trim() ?? '';
      if (text) options.push({ text, correct: i === correctIndex });
    }
    if (options.length < 2) return fail(400, { error: 'At least 2 options are required.' });
    if (!options.some(o => o.correct)) return fail(400, { error: 'Mark a correct answer.' });

    const maxOrder = await prisma.question.aggregate({ where: { examId: exam.id }, _max: { orderIndex: true } });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    await prisma.question.create({
      data: {
        examId:     exam.id,
        type:       'mcq',
        body,
        topic,
        marks,
        orderIndex: nextOrder,
        options: {
          create: options.map((o, i) => ({
            optionText: o.text,
            isCorrect:  o.correct,
            orderIndex: i,
          })),
        },
      },
    });

    return { success: true, action: 'add_mcq' };
  },

  add_truefalse: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const body = fd.get('body')?.toString().trim() ?? '';
    const topic = fd.get('topic')?.toString().trim() || null;
    const marks = parseInt(fd.get('marks')?.toString() ?? '1') || 1;
    const correctAnswer = fd.get('correctAnswer')?.toString() === 'true' ? 'True' : 'False';

    if (!body) return fail(400, { error: 'Question body is required.' });

    const maxOrder = await prisma.question.aggregate({ where: { examId: exam.id }, _max: { orderIndex: true } });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    await prisma.question.create({
      data: {
        examId:     exam.id,
        type:       'mcq',
        body,
        topic,
        marks,
        orderIndex: nextOrder,
        options: {
          create: [
            { optionText: 'True',  isCorrect: correctAnswer === 'True',  orderIndex: 0 },
            { optionText: 'False', isCorrect: correctAnswer === 'False', orderIndex: 1 },
          ],
        },
      },
    });

    return { success: true, action: 'add_truefalse' };
  },

  edit_question: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const questionId = fd.get('questionId')?.toString() ?? '';
    if (!UUID_RE.test(questionId)) return fail(400, { error: 'Invalid question.' });

    const question = await prisma.question.findFirst({ where: { id: questionId, examId: exam.id }, include: { options: true } });
    if (!question) return fail(404, { error: 'Question not found.' });

    const body = fd.get('body')?.toString().trim() ?? '';
    const topic = fd.get('topic')?.toString().trim() || null;
    const marks = parseInt(fd.get('marks')?.toString() ?? '1') || 1;

    if (!body) return fail(400, { error: 'Question body is required.' });

    const isTF = question.options.length === 2 &&
      question.options.some(o => o.optionText === 'True') &&
      question.options.some(o => o.optionText === 'False');

    if (isTF) {
      const correctAnswer = fd.get('correctAnswer')?.toString() === 'true' ? 'True' : 'False';
      await prisma.$transaction([
        prisma.question.update({ where: { id: questionId }, data: { body, topic, marks } }),
        ...question.options.map(o =>
          prisma.questionOption.update({ where: { id: o.id }, data: { isCorrect: o.optionText === correctAnswer } })
        ),
      ]);
    } else {
      const correctIndex = parseInt(fd.get('correctOption')?.toString() ?? '0');
      const options: string[] = [];
      for (let i = 0; fd.has(`option_${i}`); i++) {
        const text = fd.get(`option_${i}`)?.toString().trim() ?? '';
        if (text) options.push(text);
      }
      if (options.length < 2) return fail(400, { error: 'At least 2 options are required.' });

      await prisma.$transaction([
        prisma.question.update({ where: { id: questionId }, data: { body, topic, marks } }),
        prisma.questionOption.deleteMany({ where: { questionId } }),
        prisma.questionOption.createMany({
          data: options.map((text, i) => ({
            questionId,
            optionText: text,
            isCorrect:  i === correctIndex,
            orderIndex: i,
          })),
        }),
      ]);
    }

    return { success: true, action: 'edit_question' };
  },

  delete_question: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const questionId = fd.get('questionId')?.toString() ?? '';
    if (!UUID_RE.test(questionId)) return fail(400, { error: 'Invalid question.' });

    const question = await prisma.question.findFirst({ where: { id: questionId, examId: exam.id } });
    if (!question) return fail(404, { error: 'Question not found.' });

    await prisma.question.delete({ where: { id: questionId } });
    return { success: true, action: 'delete_question' };
  },

  reorder: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const order = fd.get('order')?.toString().split(',').filter(Boolean) ?? [];
    if (order.length === 0) return fail(400, { error: 'No order provided.' });

    await prisma.$transaction(
      order.map((id, i) =>
        prisma.question.updateMany({ where: { id, examId: exam.id }, data: { orderIndex: i } })
      )
    );

    return { success: true, action: 'reorder' };
  },

  bulk_import: async (event) => {
    const exam = await requireEditable(event);
    const prisma = await getPrismaClient();
    const fd = await event.request.formData();

    const raw = fd.get('json')?.toString().trim() ?? '';
    if (!raw) return fail(400, { error: 'No JSON provided.' });

    let questions: any[];
    try {
      questions = JSON.parse(raw);
      if (!Array.isArray(questions)) throw new Error('Must be a JSON array');
    } catch (e: any) {
      return fail(400, { error: 'Invalid JSON: ' + e.message });
    }

    if (questions.length === 0) return fail(400, { error: 'No questions found in payload.' });

    const maxOrder = await prisma.question.aggregate({ where: { examId: exam.id }, _max: { orderIndex: true } });
    let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    let count = 0;
    for (const q of questions) {
      const body = q.body?.toString().trim();
      if (!body) continue;
      const marks = parseInt(q.marks) || 1;
      const topic = q.topic?.toString().trim() || null;

      if (q.type === 'truefalse') {
        const correct = q.correctAnswer?.toString().toLowerCase() === 'true' ? 'True' : 'False';
        await prisma.question.create({
          data: {
            examId: exam.id, type: 'mcq', body, topic, marks, orderIndex: nextOrder++,
            options: {
              create: [
                { optionText: 'True',  isCorrect: correct === 'True',  orderIndex: 0 },
                { optionText: 'False', isCorrect: correct === 'False', orderIndex: 1 },
              ],
            },
          },
        });
        count++;
      } else if (q.type === 'mcq') {
        const opts: string[] = Array.isArray(q.options) ? q.options.map((o: any) => o.toString().trim()).filter(Boolean) : [];
        if (opts.length < 2) continue;
        const correctIndex = Math.min(parseInt(q.correctIndex) || 0, opts.length - 1);
        await prisma.question.create({
          data: {
            examId: exam.id, type: 'mcq', body, topic, marks, orderIndex: nextOrder++,
            options: {
              create: opts.map((text, i) => ({ optionText: text, isCorrect: i === correctIndex, orderIndex: i })),
            },
          },
        });
        count++;
      }
    }

    if (count === 0) return fail(400, { error: 'No valid questions could be imported.' });
    return { success: true, action: 'bulk_import', count };
  },
};