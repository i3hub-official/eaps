// src/routes/lecturer/exams/[examId]/+page.server.ts

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
  getExamForLecturer, updateExam, setExamStatus, countEligibleStudents,
  assignInvigilator, removeInvigilator,
} from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';
import { UUID_RE } from '$lib/server/exam/session-engine.js';

type ActionEvent = {
  locals: App.Locals;
  params: { examId?: string };
  request: Request;
};

async function loadOwnedExam(event: ActionEvent) {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const { examId } = event.params;
  if (!examId || !UUID_RE.test(examId)) throw error(400, 'Invalid exam id');

  const exam = await getExamForLecturer(examId, user.id);
  if (!exam) throw error(404, 'Exam not found');

  return { exam, user };
}

export const load: PageServerLoad = async (event) => {
  const { exam } = await loadOwnedExam(event);
  const prisma = await getPrismaClient();

  const [levels, departments, invigilators, eligibleCount] = await Promise.all([
    prisma.level.findMany({ orderBy: { order: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { role: 'invigilator', isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true, staffId: true },
    }),
    countEligibleStudents(exam),
  ]);

  return { exam, levels, departments, invigilators, eligibleCount };
};

export const actions: Actions = {
  update: async (event) => {
    const { exam } = await loadOwnedExam(event);
    if (exam.status === 'active' || exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { message: `Cannot edit an exam that is ${exam.status}.` });
    }

    const formData = await event.request.formData();
    const { values, errors } = parseExamForm(formData);
    if (Object.keys(errors).length > 0) return fail(400, { errors });

    await updateExam(exam.id, {
      title: values.title,
      instructions: values.instructions ?? undefined,
      durationMinutes: values.durationMinutes,
      totalMarks: values.totalMarks,
      passMark: values.passMark,
      scheduledStart: values.scheduledStart,
      scheduledEnd: values.scheduledEnd,
      allowLateEntry: values.allowLateEntry,
      lateEntryMinutes: values.lateEntryMinutes,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions: values.randomizeOptions,
      showResultAfter: values.showResultAfter,
      maxViolations: values.maxViolations,
      questionsToPresent: values.questionsToPresent,
      levels: values.levels,
      department: values.department,
    });

    return { success: true };
  },

  publish: async (event) => {
    const { exam } = await loadOwnedExam(event);
    if (exam.status !== 'draft') return fail(400, { message: 'Only draft exams can be published.' });
    if (!exam.scheduledStart || !exam.scheduledEnd) {
      return fail(400, { message: 'Set a scheduled start and end time before publishing.' });
    }
    if (exam._count.questions === 0) {
      return fail(400, { message: 'Add at least one question before publishing.' });
    }
    await setExamStatus(exam.id, 'scheduled');
    return { success: true };
  },

  unpublish: async (event) => {
    const { exam } = await loadOwnedExam(event);
    if (exam.status !== 'scheduled') return fail(400, { message: 'Only scheduled exams can be unpublished.' });
    if (exam.scheduledStart && exam.scheduledStart <= new Date()) {
      return fail(400, { message: 'This exam has already started and cannot be unpublished.' });
    }
    await setExamStatus(exam.id, 'draft');
    return { success: true };
  },

  cancel: async (event) => {
    const { exam } = await loadOwnedExam(event);
    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return fail(400, { message: `Exam is already ${exam.status}.` });
    }
    await setExamStatus(exam.id, 'cancelled');
    return { success: true };
  },

  assign_invigilator: async (event) => {
    const { exam } = await loadOwnedExam(event);
    const formData = await event.request.formData();
    const invigilatorId = (formData.get('invigilatorId') ?? '').toString();
    if (!UUID_RE.test(invigilatorId)) return fail(400, { message: 'Select an invigilator.' });
    await assignInvigilator(exam.id, invigilatorId);
    return { success: true };
  },

  remove_invigilator: async (event) => {
    const { exam } = await loadOwnedExam(event);
    const formData = await event.request.formData();
    const invigilatorId = (formData.get('invigilatorId') ?? '').toString();
    if (!UUID_RE.test(invigilatorId)) return fail(400, { message: 'Invalid invigilator.' });
    await removeInvigilator(exam.id, invigilatorId);
    return { success: true };
  },
};