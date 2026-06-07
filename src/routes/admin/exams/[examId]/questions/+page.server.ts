// src/routes/admin/exams/[examId]/questions/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  await requireAdmin(locals.user);

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { select: { code: true, title: true } },
      lecturer: {
        select: {
          id: true,
          fullName: true,
          staffId: true,
          department: { select: { name: true } },
        },
      },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          fitbAnswers: true,
        },
      },
    },
  });

  if (!exam) throw error(404, 'Exam not found');

  return { exam };
};

export const actions: Actions = {
  // ── Add a single question ─────────────────────────────────────────────────
  addQuestion: async ({ request, locals, params }) => {
    await requireAdmin(locals.user);

    const fd = await request.formData();
    const type = String(fd.get('type') ?? '').trim() as 'mcq' | 'fill_in_the_blank';
    const body = String(fd.get('body') ?? '').trim();
    const topic = String(fd.get('topic') ?? '').trim() || undefined;
    const marks = Number(fd.get('marks') ?? 1);

    if (!body) return fail(400, { error: 'Question body is required' });
    if (!['mcq', 'fill_in_the_blank'].includes(type)) return fail(400, { error: 'Invalid question type' });

    const exam = await prisma.exam.findUnique({ where: { id: params.examId } });
    if (!exam) return fail(404, { error: 'Exam not found' });

    const count = await prisma.question.count({ where: { examId: params.examId } });

    if (type === 'mcq') {
      const optionTexts: string[] = [];
      const optionCorrect: boolean[] = [];

      for (const [key, val] of fd.entries()) {
        const m = key.match(/^option_text_(\d+)$/);
        if (m) {
          const idx = Number(m[1]);
          optionTexts[idx] = String(val).trim();
          optionCorrect[idx] = fd.get(`option_correct_${idx}`) === 'on';
        }
      }

      const validOptions = optionTexts.filter(Boolean);
      if (validOptions.length < 2) return fail(400, { error: 'MCQ requires at least 2 options' });
      if (!optionCorrect.some(Boolean)) return fail(400, { error: 'At least one correct option is required' });

      await prisma.question.create({
        data: {
          examId: params.examId,
          type,
          body,
          topic,
          marks,
          orderIndex: count,
          options: {
            create: optionTexts
              .map((text, i) => ({ optionText: text, isCorrect: !!optionCorrect[i], orderIndex: i }))
              .filter(o => o.optionText),
          },
        },
      });
    } else {
      const primaryAnswer = String(fd.get('fitb_primary') ?? '').trim();
      const altAnswers: string[] = [];
      for (const [key, val] of fd.entries()) {
        if (key.startsWith('fitb_alt_')) altAnswers.push(String(val).trim());
      }

      if (!primaryAnswer) return fail(400, { error: 'Primary answer is required for fill-in-the-blank' });

      await prisma.question.create({
        data: {
          examId: params.examId,
          type,
          body,
          topic,
          marks,
          orderIndex: count,
          fitbAnswers: {
            create: [
              { acceptedAnswer: primaryAnswer, isPrimary: true },
              ...altAnswers.filter(Boolean).map(a => ({ acceptedAnswer: a, isPrimary: false })),
            ],
          },
        },
      });
    }

    return { success: true };
  },

  // ── Delete a question ─────────────────────────────────────────────────────
  deleteQuestion: async ({ request, locals }) => {
    await requireAdmin(locals.user);

    const fd = await request.formData();
    const questionId = String(fd.get('questionId') ?? '').trim();
    if (!questionId) return fail(400, { error: 'Question ID required' });

    await prisma.question.delete({ where: { id: questionId } });
    return { success: true };
  },

  // ── Bulk import via JSON payload ──────────────────────────────────────────
  bulkImport: async ({ request, locals, params }) => {
    await requireAdmin(locals.user);

    const fd = await request.formData();
    const raw = String(fd.get('questions_json') ?? '').trim();

    let questions: Array<{
      type: string;
      body: string;
      topic?: string;
      marks?: number;
      options?: Array<{ text: string; correct: boolean }>;
      answers?: string[];
    }>;

    try {
      questions = JSON.parse(raw);
      if (!Array.isArray(questions)) throw new Error('Expected array');
    } catch {
      return fail(400, { error: 'Invalid JSON. Expected an array of question objects.' });
    }

    const existing = await prisma.question.count({ where: { examId: params.examId } });

    // ── Strategy: createMany for the question rows (one round-trip),
    //    then createMany for options and fitbAnswers separately.
    //    No interactive transaction — no timeout risk.
    //
    //    We need the inserted question IDs to attach child rows, so we
    //    insert questions one-by-one in a plain Promise.all with a
    //    concurrency cap of 10 to stay well within connection limits.

    const CHUNK = 10;
    const created: { id: string; index: number }[] = [];

    for (let i = 0; i < questions.length; i += CHUNK) {
      const slice = questions.slice(i, i + CHUNK);

      const results = await Promise.all(
        slice.map((q, j) => {
          const type = q.type === 'fitb' ? 'fill_in_the_blank' : 'mcq';
          return prisma.question.create({
            data: {
              examId: params.examId,
              type: type as 'mcq' | 'fill_in_the_blank',
              body: (q.body ?? '').trim(),
              topic: q.topic?.trim() || undefined,
              marks: Number(q.marks ?? 1),
              orderIndex: existing + i + j,
            },
            select: { id: true },
          });
        })
      );

      results.forEach((r, j) => created.push({ id: r.id, index: i + j }));
    }

    // ── Attach child rows in bulk ─────────────────────────────────────────
    const optionRows: {
      questionId: string;
      optionText: string;
      isCorrect: boolean;
      orderIndex: number;
    }[] = [];

    const fitbRows: {
      questionId: string;
      acceptedAnswer: string;
      isPrimary: boolean;
    }[] = [];

    for (const { id, index } of created) {
      const q = questions[index];
      const type = q.type === 'fitb' ? 'fill_in_the_blank' : 'mcq';

      if (type === 'mcq' && Array.isArray(q.options)) {
        q.options.forEach((o, oi) => {
          if (o.text?.trim()) {
            optionRows.push({
              questionId: id,
              optionText: o.text.trim(),
              isCorrect: !!o.correct,
              orderIndex: oi,
            });
          }
        });
      }

      if (type === 'fill_in_the_blank' && Array.isArray(q.answers)) {
        q.answers.forEach((a, ai) => {
          if (a?.trim()) {
            fitbRows.push({
              questionId: id,
              acceptedAnswer: a.trim(),
              isPrimary: ai === 0,
            });
          }
        });
      }
    }

    // createMany is a single INSERT per table — very fast, no timeout
    await Promise.all([
      optionRows.length > 0
        ? prisma.questionOption.createMany({ data: optionRows })
        : Promise.resolve(),
      fitbRows.length > 0
        ? prisma.fitbAnswer.createMany({ data: fitbRows })
        : Promise.resolve(),
    ]);

    return { success: true, imported: questions.length };
  },

  // ── Update exam status ────────────────────────────────────────────────────
  updateStatus: async ({ request, locals, params }) => {
    await requireAdmin(locals.user);

    const fd = await request.formData();
    const status = String(fd.get('status') ?? '').trim() as
      'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

    const valid = ['draft', 'scheduled', 'active', 'completed', 'cancelled'];
    if (!valid.includes(status)) return fail(400, { error: 'Invalid status' });

    await prisma.exam.update({ where: { id: params.examId }, data: { status } });
    return { success: true };
  },
};