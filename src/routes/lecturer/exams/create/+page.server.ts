// src/routes/lecturer/exams/create/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { createExam, getActiveAcademicSemester, getCoursesForLecturer } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const prisma = await getPrismaClient();

  const [courses, levels, departments, activeSemester] = await Promise.all([
    getCoursesForLecturer(user),
    prisma.level.findMany({ orderBy: { order: 'asc' } }),
    // ✅ Fix: Include department code in the select
    prisma.department.findMany({ 
      orderBy: { name: 'asc' }, 
      select: { 
        id: true, 
        name: true,
        code: true 
      } 
    }),
    getActiveAcademicSemester(),
  ]);

  return {
    courses,
    levels,
    departments, // Now departments has id, name, code
    defaultSession: activeSemester?.session ?? '',
    defaultSemester: activeSemester?.semester ?? 1,
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
      courseId: values.courseId,
      createdBy: user.id,
      title: values.title,
      instructions: values.instructions ?? undefined,
      durationMinutes: values.durationMinutes,
      totalMarks: values.totalMarks,
      passMark: values.passMark,
      scheduledStart: values.scheduledStart ?? undefined,
      scheduledEnd: values.scheduledEnd ?? undefined,
      allowLateEntry: values.allowLateEntry,
      lateEntryMinutes: values.lateEntryMinutes,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions: values.randomizeOptions,
      showResultAfter: values.showResultAfter,
      maxViolations: values.maxViolations,
      questionsToPresent: values.questionsToPresent,
      session: values.session,
      semester: values.semester,
      levels: values.levels,
      department: values.department,
    });

    throw redirect(303, `/lecturer/exams/${exam.id}`);
  },
};

function serialize(values: ReturnType<typeof parseExamForm>['values']) {
  return {
    ...values,
    scheduledStart: values.scheduledStart?.toISOString() ?? '',
    scheduledEnd: values.scheduledEnd?.toISOString() ?? '',
  };
}