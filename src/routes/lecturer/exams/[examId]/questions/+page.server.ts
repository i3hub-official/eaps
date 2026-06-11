// src/routes/lecturer/exams/[examId]/questions/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer, requireOwnership } from '$lib/server/auth/guards.js';
import { getExamById } from '$lib/server/db/exams.js';
import { getQuestionsForExam, createMCQ, createFITB, deleteQuestion } from '$lib/server/db/questions.js';
import { prisma } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamById(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  const questions = await getQuestionsForExam(exam.id);

  const invigilators = await prisma.user.findMany({
    where: { role: 'invigilator', isActive: true },
    select: { id: true, fullName: true, staffId: true },
    orderBy: { fullName: 'asc' },
  });

  const assignments = await prisma.examInvigilator.findMany({
    where: { examId: params.examId },
    include: { invigilator: { select: { id: true, fullName: true, staffId: true } } },
  });

  let conflicts: Record<string, string[]> = {};
  if (exam.scheduledStart && exam.scheduledEnd) {
    const conflictRows = await sql<{ invigilator_id: string; exam_title: string }>(
      `SELECT ei.invigilator_id, e.title AS exam_title
       FROM exam_invigilators ei
       JOIN exams e ON ei.exam_id = e.id
       WHERE ei.exam_id != $1
         AND e.status NOT IN ('cancelled','completed')
         AND e.scheduled_start < $3
         AND e.scheduled_end   > $2`,
      [params.examId, exam.scheduledStart, exam.scheduledEnd]
    );
    for (const row of conflictRows) {
      if (!conflicts[row.invigilator_id]) conflicts[row.invigilator_id] = [];
      conflicts[row.invigilator_id].push(row.exam_title);
    }
  }

  const existingBodies = new Set(questions.map(q => q.body.trim().toLowerCase()));

  return { user, exam, questions, invigilators, assignments, conflicts, existingBodies: [...existingBodies] };
};

/**
 * Create ExamSession records for all students registered for this course.
 * Called after exam is activated. Uses batch processing to avoid timeouts.
 */
async function createSessionsForRegisteredStudents(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { courseId: true, session: true, semester: true, durationMinutes: true },
  });
  if (!exam) return;

  // Get all registered students for this course
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.courseId,
      session: exam.session,
      semester: exam.semester,
    },
    select: { studentId: true },
  });

  if (registrations.length === 0) return;

  // Get existing sessions to avoid duplicates
  const existingSessions = await prisma.examSession.findMany({
    where: { examId },
    select: { studentId: true },
  });
  
  const existingStudentIds = new Set(existingSessions.map(s => s.studentId));
  
  // Filter out students who already have sessions
  const newRegistrations = registrations.filter(reg => !existingStudentIds.has(reg.studentId));
  
  if (newRegistrations.length === 0) return;
  
  // Batch create new sessions - 100 at a time to avoid timeout
  const batchSize = 100;
  const totalBatches = Math.ceil(newRegistrations.length / batchSize);
  
  console.log(`[DB] Creating ${newRegistrations.length} exam sessions in ${totalBatches} batches`);
  
  for (let i = 0; i < newRegistrations.length; i += batchSize) {
    const batch = newRegistrations.slice(i, i + batchSize);
    
    await prisma.examSession.createMany({
      data: batch.map(reg => ({
        examId,
        studentId: reg.studentId,
        status: 'not_started',
        timeRemainingSecs: exam.durationMinutes * 60,
      })),
      skipDuplicates: true, // Skip if duplicate (safety net)
    });
    
    console.log(`[DB] Batch ${Math.floor(i / batchSize) + 1}/${totalBatches} completed`);
  }
  
  console.log(`[DB] Successfully created ${newRegistrations.length} exam sessions`);
}

export const actions: Actions = {
  addMCQ: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const body  = String(d.get('body')  ?? '').trim();
    const marks = Number(d.get('marks') ?? 1);
    const topic = String(d.get('topic') ?? '').trim() || undefined;

    if (!body) return fail(400, { addError: 'Question body is required' });

    const options = [];
    let hasCorrect = false;
    for (let i = 0; i < 6; i++) {
      const text    = String(d.get(`option_${i}`)  ?? '').trim();
      const correct = d.get(`correct_${i}`) === 'on';
      if (text) {
        options.push({ optionText: text, isCorrect: correct, orderIndex: i });
        if (correct) hasCorrect = true;
      }
    }

    if (options.length < 2) return fail(400, { addError: 'At least 2 options are required' });
    if (!hasCorrect)         return fail(400, { addError: 'Mark at least one correct answer' });

    await createMCQ({ examId: exam.id, body, marks, options, topic });
    return { success: true };
  },

  addFITB: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const body  = String(d.get('body')  ?? '').trim();
    const marks = Number(d.get('marks') ?? 1);
    const topic = String(d.get('topic') ?? '').trim() || undefined;

    if (!body) return fail(400, { addError: 'Question body is required' });

    const answers = [];
    for (let i = 0; i < 5; i++) {
      const ans = String(d.get(`answer_${i}`) ?? '').trim();
      if (ans) answers.push({ acceptedAnswer: ans, isPrimary: i === 0 });
    }

    if (answers.length === 0) return fail(400, { addError: 'At least one accepted answer is required' });

    await createFITB({ examId: exam.id, body, marks, answers, topic });
    return { success: true };
  },

  deleteQuestion: async ({ request, locals }) => {
    requireLecturer(locals.user);
    const d  = await request.formData();
    const id = String(d.get('id') ?? '');
    if (id) await deleteQuestion(id);
    return { success: true };
  },

  importQuestions: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d   = await request.formData();
    const raw = String(d.get('questions') ?? '').trim();
    if (!raw) return fail(400, { addError: 'No questions data received' });

    let incoming: any[];
    try { incoming = JSON.parse(raw); }
    catch { return fail(400, { addError: 'Invalid questions payload' }); }

    if (!Array.isArray(incoming) || incoming.length === 0)
      return fail(400, { addError: 'No valid questions to import' });

    const existing = await getQuestionsForExam(exam.id);
    const existingBodies = new Set(existing.map(q => q.body.trim().toLowerCase()));

    let imported = 0;
    let skipped  = 0;

    for (const q of incoming) {
      if (!q.body || q.error) continue;
      if (existingBodies.has(q.body.trim().toLowerCase())) { skipped++; continue; }

      try {
        if (q.type === 'fitb') {
          const answers = (q.answers ?? []).map((a: string, i: number) => ({
            acceptedAnswer: a, isPrimary: i === 0,
          }));
          if (answers.length === 0) continue;
          await createFITB({ examId: exam.id, body: q.body, marks: q.marks ?? 1, answers, topic: q.topic });
          existingBodies.add(q.body.trim().toLowerCase());
          imported++;
        } else {
          const options = (q.options ?? []).map((o: any, i: number) => ({
            optionText: o.text, isCorrect: !!o.correct, orderIndex: i,
          }));
          if (options.length < 2 || !options.some((o: any) => o.isCorrect)) continue;
          await createMCQ({ examId: exam.id, body: q.body, marks: q.marks ?? 1, options, topic: q.topic });
          existingBodies.add(q.body.trim().toLowerCase());
          imported++;
        }
      } catch { /* skip */ }
    }

    if (imported === 0 && skipped === 0)
      return fail(400, { addError: 'No questions could be imported — check format' });

    return { importSuccess: imported, importSkipped: skipped };
  },

  assignInvigilator: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d             = await request.formData();
    const invigilatorId = String(d.get('invigilator_id') ?? '').trim();
    if (!invigilatorId) return fail(400, { invigilatorError: 'Select an invigilator' });

    if (exam.scheduledStart && exam.scheduledEnd) {
      const conflict = await sql<{ exam_title: string }>(
        `SELECT e.title AS exam_title
         FROM exam_invigilators ei
         JOIN exams e ON ei.exam_id = e.id
         WHERE ei.invigilator_id = $1
           AND ei.exam_id != $2
           AND e.status NOT IN ('cancelled','completed')
           AND e.scheduled_start < $4
           AND e.scheduled_end   > $3
         LIMIT 1`,
        [invigilatorId, params.examId, exam.scheduledStart, exam.scheduledEnd]
      );
      if (conflict.length > 0)
        return fail(409, { invigilatorError: `This invigilator is already assigned to "${conflict[0].exam_title}" at the same time.` });
    }

    await prisma.examInvigilator.upsert({
      where: { examId_invigilatorId: { examId: params.examId, invigilatorId } },
      create: { examId: params.examId, invigilatorId },
      update: {},
    });

    return { assignSuccess: true };
  },

  removeInvigilator: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d             = await request.formData();
    const invigilatorId = String(d.get('invigilator_id') ?? '').trim();

    await prisma.examInvigilator.delete({
      where: { examId_invigilatorId: { examId: params.examId, invigilatorId } },
    }).catch(() => {});

    return { removeSuccess: true };
  },

  updateSettings: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    const d = await request.formData();
    const questionsToPresent = Number(d.get('questions_to_present') ?? 0);
    const randomizeQuestions = d.get('randomize_questions') === 'on';
    const randomizeOptions   = d.get('randomize_options')   === 'on';
    const showResultAfter    = d.get('show_result_after')   === 'on';
    const maxViolations      = Number(d.get('max_violations') ?? 5);

    const totalQ = await prisma.question.count({ where: { examId: params.examId } });
    if (questionsToPresent > 0 && questionsToPresent > totalQ)
      return fail(400, { settingsError: `Questions to present (${questionsToPresent}) exceeds question count (${totalQ})` });

    await prisma.exam.update({
      where: { id: params.examId },
      data: { questionsToPresent, randomizeQuestions, randomizeOptions, showResultAfter, maxViolations },
    });

    return { settingsSuccess: true };
  },

  activateExam: async ({ params, locals }) => {
    const user = requireLecturer(locals.user);
    const exam = await getExamById(params.examId);
    if (!exam) error(404, 'Exam not found');
    requireOwnership(user, exam.createdBy);

    if (exam.status === 'cancelled') {
    return fail(400, { activateError: 'Cannot activate a cancelled exam' });
  }

    if (exam.status !== 'scheduled' && exam.status !== 'draft')
      return fail(400, { activateError: 'Exam must be in draft or scheduled status to activate' });

    const qCount = await prisma.question.count({ where: { examId: params.examId } });
    if (qCount === 0)
      return fail(400, { activateError: 'Add at least one question before activating' });

    await prisma.exam.update({ where: { id: params.examId }, data: { status: 'active' } });
    
    // Auto-create exam sessions for all registered students
    await createSessionsForRegisteredStudents(params.examId);

    return { activateSuccess: true };
  },
};