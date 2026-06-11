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

/**
 * Create ExamSession records for all students registered for this course.
 * Called after exam is activated. Upsert prevents duplicates.
 */
async function createSessionsForRegisteredStudents(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { courseId: true, session: true, semester: true, durationMinutes: true },
  });
  if (!exam) return;

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.courseId,
      session: exam.session,
      semester: exam.semester,
    },
    select: { studentId: true },
  });

  if (registrations.length === 0) return;

  await prisma.$transaction(
    registrations.map(reg =>
      prisma.examSession.upsert({
        where: { examId_studentId: { examId, studentId: reg.studentId } },
        create: {
          examId,
          studentId: reg.studentId,
          status: 'not_started',
          timeRemainingSecs: exam.durationMinutes * 60,
        },
        update: {},
      })
    )
  );
}

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

    const count = await getQuestionCount(exam.id);
    if (count === 0) return fail(400, { activateError: 'Add at least one question before activating' });

    await setExamStatus(exam.id, 'active');
    
    // Auto-create exam sessions for all registered students
    await createSessionsForRegisteredStudents(exam.id);

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

  // Add this to the existing actions object
cancelExam: async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamWithCourse(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);
  
  // Can only cancel if not already completed or cancelled
  if (exam.status === 'completed') {
    return fail(400, { cancelError: 'Cannot cancel a completed exam' });
  }
  if (exam.status === 'cancelled') {
    return fail(400, { cancelError: 'Exam is already cancelled' });
  }
  
  await setExamStatus(exam.id, 'cancelled');
  
  // Optional: Force submit any active sessions
  await prisma.examSession.updateMany({
    where: { 
      examId: params.examId,
      status: { in: ['active', 'in_progress'] }
    },
    data: { 
      status: 'force_submitted',
      submittedAt: new Date()
    }
  });
  
  return { cancelSuccess: true };
},
};