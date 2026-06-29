// src/routes/lecturer/exams/create/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { createExam, getActiveAcademicSemester, getCoursesForLecturer } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';

export const load: PageServerLoad = async (event) => {
  const user = await requireLecturer(event.locals.user);
  const prisma = await getPrismaClient();

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

  return {
    courses,
    levels,
    departments,
    sessions,
    defaultSession:  activeSemester?.session  ?? derivedSession,
    defaultSemester: activeSemester?.semester ?? 1,
    examTotal: 70,
    caTotal: 30,
    totalMarks: 100,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = event.locals.user;
    if (!user) throw redirect(303, '/login');
    if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

    const formData = await event.request.formData();
    const { values, errors } = parseExamForm(formData);

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: serialize(values) });
    }

    const exam = await createExam({
      courseId:           values.courseId,
      createdBy:          user.id,
      title:              values.title,
      instructions:       values.instructions ?? undefined,
      durationMinutes:    values.durationMinutes,
      totalMarks:         values.totalMarks,
      passMark:           values.passMark,
      scheduledStart:     values.scheduledStart ?? undefined,
      scheduledEnd:       values.scheduledEnd   ?? undefined,
      allowLateEntry:     values.allowLateEntry,
      lateEntryMinutes:   values.lateEntryMinutes,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions:   values.randomizeOptions,
      showResultAfter:    values.showResultAfter,
      maxViolations:      values.maxViolations,
      questionsToPresent: values.questionsToPresent,
      marksPerQuestion:   values.marksPerQuestion,
      session:            values.session,
      semester:           values.semester,
      levels:             values.levels,
      department:         values.department,
    });

    throw redirect(303, `/lecturer/exams/${exam.id}`);
  },
};

function serialize(values: ReturnType<typeof parseExamForm>['values']) {
  return {
    ...values,
    scheduledStart: values.scheduledStart?.toISOString() ?? '',
    scheduledEnd:   values.scheduledEnd?.toISOString()   ?? '',
  };
}