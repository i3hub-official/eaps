// src/routes/(lecturer)/exams/[examId]/questions/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamById } from '$lib/server/db/exams.js';
import { getQuestionsForExam, createMCQ, createFITB, deleteQuestion } from '$lib/server/db/questions.js';
import { requireOwnership } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  const questions = await getQuestionsForExam(exam.id);
  return { user, exam, questions };
};

export const actions: Actions = {
  addMCQ: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const body = String(d.get('body') ?? '').trim();
    const marks = Number(d.get('marks') ?? 1);

    if (!body) return fail(400, { addError: 'Question body is required' });

    const options = [];
    let hasCorrect = false;
    for (let i = 0; i < 6; i++) {
      const text = String(d.get(`option_${i}`) ?? '').trim();
      const correct = d.get(`correct_${i}`) === 'on';
      if (text) {
        options.push({ optionText: text, isCorrect: correct, orderIndex: i });
        if (correct) hasCorrect = true;
      }
    }

    if (options.length < 2) return fail(400, { addError: 'At least 2 options are required' });
    if (!hasCorrect)        return fail(400, { addError: 'Mark at least one correct answer' });

    await createMCQ({ examId: exam.id, body, marks, options });
    return { success: true };
  },

  addFITB: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const body = String(d.get('body') ?? '').trim();
    const marks = Number(d.get('marks') ?? 1);

    if (!body) return fail(400, { addError: 'Question body is required' });

    const answers = [];
    for (let i = 0; i < 5; i++) {
      const ans = String(d.get(`answer_${i}`) ?? '').trim();
      if (ans) answers.push({ acceptedAnswer: ans, isPrimary: i === 0 });
    }

    if (answers.length === 0) return fail(400, { addError: 'At least one accepted answer is required' });

    await createFITB({ examId: exam.id, body, marks, answers });
    return { success: true };
  },

  deleteQuestion: async ({ request, locals }) => {
    requireLecturer(locals.user);
    const d = await request.formData();
    const id = String(d.get('id') ?? '');
    if (id) await deleteQuestion(id);
    return { success: true };
  },
};