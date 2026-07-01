// src/routes/lecturer/exams/[examId]/edit/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { updateExam, getActiveAcademicSemester, getCoursesForLecturer } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async (event) => {
  const { params, locals } = event;
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  if (!uuidRegex.test(examId)) {
    throw error(404, 'Exam not found');
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      levels: { select: { level: true } },
      examDepartments: { include: { department: true } },
    },
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  // ── Hard lock: once an exam has left draft status, it is visible to
  // students (scheduled) or already in progress/finished. Editing core
  // exam parameters (timing, marks, scope) after that point would corrupt
  // an exam students may already be relying on. Redirect straight back
  // to the read-only detail page instead of rendering the edit form.
  if (exam.status !== 'draft') {
    throw redirect(303, `/lecturer/exams/${examId}`);
  }

  const [courses, levels, departments, semesterRows, activeSemester] = await Promise.all([
    getCoursesForLecturer({ departmentId: (user as any).departmentId ?? null }),

    prisma.level.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, level: true },
    }).then(rows => rows.map(r => ({
      id:    String(r.id),
      name:  r.name || `${r.level} Level`,
      value: r.level,
    }))),

    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, code: true },
    }),

    prisma.academicSemester.findMany({
      orderBy: { session: 'desc' },
      select:  { id: true, session: true, semester: true, isActive: true },
    }),

    getActiveAcademicSemester(),
  ]);

  const currentYear  = new Date().getFullYear();
  const derivedSession =
    activeSemester?.session ??
    semesterRows[0]?.session ??
    `${currentYear}/${currentYear + 1}`;

  const seenSessions = new Set<string>();
  const sessions: Array<{ id: string; session: string }> = [];
  for (const row of semesterRows) {
    if (!seenSessions.has(row.session)) {
      seenSessions.add(row.session);
      sessions.push({ id: String(row.id), session: row.session });
    }
  }

  if (sessions.length === 0) {
    sessions.push(
      { id: 'current', session: `${currentYear}/${currentYear + 1}` },
      { id: 'next',    session: `${currentYear + 1}/${currentYear + 2}` },
    );
  }

  // Ensure the exam's own session is selectable even if it's not in the
  // current/recent semester list (e.g. editing an older draft).
  if (exam.session && !seenSessions.has(exam.session)) {
    sessions.unshift({ id: `exam-${exam.id}`, session: exam.session });
  }

  return {
    exam: {
      id:                 exam.id,
      courseId:            exam.courseId,
      title:               exam.title,
      instructions:        exam.instructions,
      durationMinutes:     exam.durationMinutes,
      totalMarks:          exam.totalMarks,
      passMark:            exam.passMark,
      scheduledStart:      exam.scheduledStart ? exam.scheduledStart.toISOString() : null,
      scheduledEnd:        exam.scheduledEnd   ? exam.scheduledEnd.toISOString()   : null,
      allowLateEntry:      exam.allowLateEntry,
      lateEntryMinutes:    exam.lateEntryMinutes,
      randomizeQuestions:  exam.randomizeQuestions,
      randomizeOptions:    exam.randomizeOptions,
      showResultAfter:     exam.showResultAfter,
      maxViolations:       exam.maxViolations,
      questionsToPresent:  exam.questionsToPresent,
      session:             exam.session,
      semester:            exam.semester,
      status:              exam.status,
      levels:              exam.levels.map(l => l.level),
      departments:         exam.examDepartments.map(ed => String(ed.department.id)),
      course:              exam.course ? { id: exam.course.id, code: exam.course.code, title: exam.course.title } : null,
    },
    courses,
    levels,
    departments,
    sessions,
    defaultSession:  exam.session,
    defaultSemester: exam.semester,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { params, locals } = event;
    const user = locals.user;
    if (!user) throw redirect(303, '/login');
    if (user.role !== 'lecturer' && user.role !== 'hod') throw error(403, 'Lecturer access only');

    const prisma = await getPrismaClient();
    const { examId } = params;

    const existing = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true, status: true },
    });

    if (!existing) throw error(404, 'Exam not found');
    if (existing.createdBy !== user.id) throw error(403, 'You do not own this exam');

    // ── Second guard at the action layer. Even if the form was somehow
    // submitted from a stale page (e.g. exam was activated in another
    // tab while this edit form was still open), reject the write here
    // too. Never trust client-side gating alone for a state transition
    // this consequential.
    if (existing.status !== 'draft') {
      return fail(400, {
        error: `This exam is no longer a draft (status: "${existing.status}") and can no longer be edited.`,
      });
    }

    const formData = await event.request.formData();
    const { values, errors } = parseExamForm(formData);

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: serialize(values) });
    }

    await updateExam(examId, {
      title:              values.title,
      instructions:       values.instructions ?? undefined,
      durationMinutes:    values.durationMinutes,
      totalMarks:         values.totalMarks,
      passMark:           values.passMark,
      scheduledStart:     values.scheduledStart ?? null,
      scheduledEnd:       values.scheduledEnd   ?? null,
      allowLateEntry:     values.allowLateEntry,
      lateEntryMinutes:   values.lateEntryMinutes,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions:   values.randomizeOptions,
      showResultAfter:    values.showResultAfter,
      maxViolations:      values.maxViolations,
      questionsToPresent: values.questionsToPresent,
      levels:             values.levels,
      department:         values.department,
    });

    throw redirect(303, `/lecturer/exams/${examId}`);
  },
};

function serialize(values: ReturnType<typeof parseExamForm>['values']) {
  return {
    ...values,
    scheduledStart: values.scheduledStart?.toISOString() ?? '',
    scheduledEnd:   values.scheduledEnd?.toISOString()   ?? '',
  };
}