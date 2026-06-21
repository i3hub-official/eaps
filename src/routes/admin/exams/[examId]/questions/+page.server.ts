// src/routes/admin/exams/[examId]/questions/+page.server.ts
//
// Admin variant of the question builder.
// Differences from the lecturer version:
//   • Auth: requireAdmin instead of ownership check — admin can edit any exam
//   • Extra action: updateStatus (admin can force-change exam status)
//   • All question actions (add_mcq, add_truefalse, edit_question,
//     delete_question, reorder, bulk_import) are identical and delegated
//     directly to the same Prisma logic.

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { UUID_RE } from '$lib/server/exam/session-engine.js';

// ─── Shared load helper ───────────────────────────────────────────────────────

async function loadExam(examId: string | undefined) {
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');
  const prisma = await getPrismaClient();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      status: true,
      totalMarks: true,
      questionsToPresent: true,
      course: { select: { code: true, title: true } },
      lecturer: {
        select: {
          id: true,
          fullName: true,
          staffId: true,
          department: { select: { name: true } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!exam) throw error(404, 'Exam not found');
  return { exam, prisma };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, params }) => {
  requireAdmin(locals.user);
  const { exam, prisma } = await loadExam(params.examId);

  const questions = await prisma.question.findMany({
    where:   { examId: exam.id },
    orderBy: { orderIndex: 'asc' },
    include: {
      options:     { orderBy: { orderIndex: 'asc' } },
      fitbAnswers: { orderBy: { isPrimary: 'desc' } },
    },
  });

  const marksAllocated = questions.reduce((sum, q) => sum + q.marks, 0);

  return { exam, questions, marksAllocated };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(fd: FormData, key: string) {
  return (fd.get(key) ?? '').toString().trim();
}

function int(fd: FormData, key: string, fallback = 1) {
  const v = parseInt((fd.get(key) ?? '').toString(), 10);
  return isNaN(v) ? fallback : v;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {

  // ── Admin-only: force status change ────────────────────────────────────────
  updateStatus: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    const fd     = await request.formData();
    const status = str(fd, 'status');

    const valid = ['draft', 'scheduled', 'active', 'completed', 'cancelled'];
    if (!valid.includes(status)) return fail(400, { error: 'Invalid status.' });

    await prisma.exam.update({ where: { id: exam.id }, data: { status: status as any } });
    return { success: true, action: 'updateStatus' };
  },

  // ── Add MCQ ────────────────────────────────────────────────────────────────
  add_mcq: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { error: 'Cannot edit a completed or cancelled exam.' });
    }

    const fd           = await request.formData();
    const body         = str(fd, 'body');
    const topic        = str(fd, 'topic') || null;
    const marks        = int(fd, 'marks', 1);
    const correctIndex = int(fd, 'correctOption', 0);

    if (!body)    return fail(400, { error: 'Question body is required.' });
    if (marks < 1) return fail(400, { error: 'Marks must be at least 1.' });

    const optionTexts: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const val = str(fd, `option_${i}`);
      if (!val && i > 0) break;
      if (val) optionTexts.push(val);
    }

    if (optionTexts.length < 2) return fail(400, { error: 'MCQ requires at least 2 options.' });
    if (correctIndex < 0 || correctIndex >= optionTexts.length) return fail(400, { error: 'Select a correct option.' });

    const last = await prisma.question.findFirst({
      where: { examId: exam.id }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true },
    });

    await prisma.question.create({
      data: {
        examId: exam.id, type: 'mcq', body, topic, marks,
        orderIndex: (last?.orderIndex ?? 0) + 1,
        options: {
          create: optionTexts.map((text, i) => ({
            optionText: text, isCorrect: i === correctIndex, orderIndex: i,
          })),
        },
      },
    });

    return { success: true, action: 'add_mcq' };
  },

  // ── Add True/False ─────────────────────────────────────────────────────────
  add_truefalse: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { error: 'Cannot edit a completed or cancelled exam.' });
    }

    const fd            = await request.formData();
    const body          = str(fd, 'body');
    const topic         = str(fd, 'topic') || null;
    const marks         = int(fd, 'marks', 1);
    const correctAnswer = str(fd, 'correctAnswer');

    if (!body) return fail(400, { error: 'Question body is required.' });
    if (!['true', 'false'].includes(correctAnswer)) return fail(400, { error: 'Select the correct answer.' });

    const last = await prisma.question.findFirst({
      where: { examId: exam.id }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true },
    });

    await prisma.question.create({
      data: {
        examId: exam.id, type: 'mcq', body, topic, marks,
        orderIndex: (last?.orderIndex ?? 0) + 1,
        options: {
          create: [
            { optionText: 'True',  isCorrect: correctAnswer === 'true',  orderIndex: 0 },
            { optionText: 'False', isCorrect: correctAnswer === 'false', orderIndex: 1 },
          ],
        },
      },
    });

    return { success: true, action: 'add_truefalse' };
  },

  // ── Edit question ──────────────────────────────────────────────────────────
  edit_question: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { error: 'Cannot edit a completed or cancelled exam.' });
    }

    const fd         = await request.formData();
    const questionId = str(fd, 'questionId');
    if (!UUID_RE.test(questionId)) return fail(400, { error: 'Invalid question id.' });

    const question = await prisma.question.findFirst({
      where: { id: questionId, examId: exam.id }, include: { options: true },
    });
    if (!question) return fail(404, { error: 'Question not found.' });

    const body  = str(fd, 'body');
    const topic = str(fd, 'topic') || null;
    const marks = int(fd, 'marks', 1);
    if (!body) return fail(400, { error: 'Question body is required.' });

    const isTF =
      question.options.length === 2 &&
      question.options.some(o => o.optionText === 'True') &&
      question.options.some(o => o.optionText === 'False');

    if (isTF) {
      const correctAnswer = str(fd, 'correctAnswer');
      if (!['true', 'false'].includes(correctAnswer)) return fail(400, { error: 'Select the correct answer.' });
      await prisma.$transaction([
        prisma.question.update({ where: { id: questionId }, data: { body, topic, marks } }),
        ...question.options.map(o =>
          prisma.questionOption.update({
            where: { id: o.id },
            data:  { isCorrect: o.optionText.toLowerCase() === correctAnswer },
          })
        ),
      ]);
    } else {
      const correctIndex = int(fd, 'correctOption', 0);
      const optionTexts: string[] = [];
      for (let i = 0; i <= 20; i++) {
        const val = str(fd, `option_${i}`);
        if (!val && i > 0) break;
        if (val) optionTexts.push(val);
      }
      if (optionTexts.length < 2) return fail(400, { error: 'At least 2 options required.' });
      if (correctIndex < 0 || correctIndex >= optionTexts.length) return fail(400, { error: 'Select a correct option.' });

      await prisma.$transaction([
        prisma.question.update({ where: { id: questionId }, data: { body, topic, marks } }),
        prisma.questionOption.deleteMany({ where: { questionId } }),
        prisma.questionOption.createMany({
          data: optionTexts.map((text, i) => ({
            questionId, optionText: text, isCorrect: i === correctIndex, orderIndex: i,
          })),
        }),
      ]);
    }

    return { success: true, action: 'edit_question' };
  },

  // ── Delete question ────────────────────────────────────────────────────────
  delete_question: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { error: 'Cannot delete from a completed or cancelled exam.' });
    }

    const fd         = await request.formData();
    const questionId = str(fd, 'questionId');
    if (!UUID_RE.test(questionId)) return fail(400, { error: 'Invalid question id.' });

    const question = await prisma.question.findFirst({ where: { id: questionId, examId: exam.id } });
    if (!question) return fail(404, { error: 'Question not found.' });

    await prisma.question.delete({ where: { id: questionId } });
    return { success: true, action: 'delete_question' };
  },

  // ── Reorder ────────────────────────────────────────────────────────────────
  reorder: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    const fd       = await request.formData();
    const orderRaw = str(fd, 'order');
    const ids      = orderRaw.split(',').map(s => s.trim()).filter(s => UUID_RE.test(s));
    if (ids.length === 0) return fail(400, { error: 'No order provided.' });

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.question.updateMany({ where: { id, examId: exam.id }, data: { orderIndex: idx + 1 } })
      )
    );

    return { success: true, action: 'reorder' };
  },

  // ── Bulk import ────────────────────────────────────────────────────────────
  bulk_import: async ({ locals, params, request }) => {
    requireAdmin(locals.user);
    const { exam, prisma } = await loadExam(params.examId);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { error: 'Cannot edit a completed or cancelled exam.' });
    }

    const fd  = await request.formData();
    const raw = str(fd, 'json');

    let items: Array<{
      type: string; body: string; topic?: string; marks?: number;
      options?: string[]; correctIndex?: number; correctAnswer?: string;
    }>;

    try {
      items = JSON.parse(raw);
      if (!Array.isArray(items)) throw new Error('Expected array');
    } catch {
      return fail(400, { error: 'Invalid JSON. Expected an array of question objects.' });
    }

    const rowErrors: string[] = [];
    items.forEach((item, i) => {
      if (!item.body) rowErrors.push(`Row ${i + 1}: missing "body"`);
      if (!['mcq', 'truefalse'].includes(item.type)) rowErrors.push(`Row ${i + 1}: type must be "mcq" or "truefalse"`);
      if (item.type === 'mcq') {
        if (!item.options || item.options.length < 2) rowErrors.push(`Row ${i + 1}: mcq needs at least 2 options`);
        if (item.correctIndex === undefined || item.correctIndex === null) rowErrors.push(`Row ${i + 1}: mcq needs correctIndex`);
      }
      if (item.type === 'truefalse') {
        if (!['true', 'false'].includes(item.correctAnswer ?? '')) rowErrors.push(`Row ${i + 1}: truefalse needs correctAnswer: "true" or "false"`);
      }
    });

    if (rowErrors.length > 0) {
      return fail(400, { error: rowErrors.slice(0, 5).join(' | ') + (rowErrors.length > 5 ? ` … (${rowErrors.length - 5} more)` : '') });
    }

    const last = await prisma.question.findFirst({
      where: { examId: exam.id }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true },
    });
    let nextOrder = (last?.orderIndex ?? 0) + 1;

    for (const item of items) {
      const isTrue     = item.type === 'truefalse';
      const optionData = isTrue
        ? [
            { optionText: 'True',  isCorrect: item.correctAnswer === 'true',  orderIndex: 0 },
            { optionText: 'False', isCorrect: item.correctAnswer === 'false', orderIndex: 1 },
          ]
        : (item.options ?? []).map((text, i) => ({
            optionText: text, isCorrect: i === (item.correctIndex ?? 0), orderIndex: i,
          }));

      await prisma.question.create({
        data: {
          examId: exam.id, type: 'mcq', body: item.body,
          topic: item.topic ?? null, marks: item.marks ?? 1,
          orderIndex: nextOrder++,
          options: { create: optionData },
        },
      });
    }

    return { success: true, action: 'bulk_import', count: items.length };
  },
};