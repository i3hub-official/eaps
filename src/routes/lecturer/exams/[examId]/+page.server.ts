// src/routes/(lecturer)/lecturer/exams/[examId]/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { requireOwnership } from '$lib/server/auth/guards.js';
import { getExamWithCourse, updateExam, setExamStatus, assignInvigilator, removeInvigilator, getExamInvigilators } from '$lib/server/db/exams.js';
import { getQuestionCount } from '$lib/server/db/questions.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamWithCourse(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  const [questionCount, invigilators, allInvigilators] = await Promise.all([
    getQuestionCount(exam.id),
    getExamInvigilators(exam.id),
    prisma.user.findMany({
      where: { role: 'invigilator', isActive: true },
      select: { id: true, fullName: true, email: true, staffId: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return { user, exam, questionCount, invigilators, allInvigilators };
};

export const actions: Actions = {
  updateSettings: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    if (exam.status !== 'draft') {
      return fail(400, { settingsError: 'Only draft exams can be edited' });
    }

    const d = await request.formData();
    await updateExam(exam.id, {
      title:             String(d.get('title')             ?? '').trim() || undefined,
      instructions:      String(d.get('instructions')      ?? '').trim() || undefined,
      durationMinutes:   Number(d.get('duration_minutes')  ?? exam.durationMinutes),
      totalMarks:        Number(d.get('total_marks')        ?? exam.totalMarks),
      passMark:          Number(d.get('pass_mark')          ?? exam.passMark),
      maxViolations:     Number(d.get('max_violations')     ?? exam.maxViolations),
      scheduledStart:    d.get('scheduled_start') ? new Date(String(d.get('scheduled_start'))) : undefined,
      scheduledEnd:      d.get('scheduled_end')   ? new Date(String(d.get('scheduled_end')))   : undefined,
      randomizeQuestions: d.get('randomize_questions') === 'on',
      randomizeOptions:   d.get('randomize_options')   === 'on',
      showResultAfter:    d.get('show_result_after')   === 'on',
    });
    return { settingsSuccess: true };
  },

  publish: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const count = await getQuestionCount(exam.id);
    if (count === 0) return fail(400, { publishError: 'Add at least one question before publishing' });

    await setExamStatus(exam.id, 'scheduled');
    return { publishSuccess: true };
  },

  activate: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);
    await setExamStatus(exam.id, 'active');
    return { activateSuccess: true };
  },

  complete: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);
    await setExamStatus(exam.id, 'completed');
    return { completeSuccess: true };
  },

  assignInvigilator: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const invigilatorId = String(d.get('invigilator_id') ?? '').trim();
    if (!invigilatorId) return fail(400, { assignError: 'Select an invigilator' });

    await assignInvigilator(exam.id, invigilatorId);
    return { assignSuccess: true };
  },

  removeInvigilator: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamWithCourse(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const invigilatorId = String(d.get('invigilator_id') ?? '').trim();
    if (invigilatorId) await removeInvigilator(exam.id, invigilatorId);
    return { removeSuccess: true };
  },
};