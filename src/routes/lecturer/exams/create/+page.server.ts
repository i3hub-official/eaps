// src/routes/lecturer/exams/create/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { createExam, getCoursesForLecturer } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';

export const load: PageServerLoad = async (event) => {
  const user = event.locals.user;
  if (!user) throw redirect(303, '/login');
  if (user.role !== 'lecturer') throw error(403, 'Lecturer access only');

  const prisma = await getPrismaClient();

  // ── Fetch lecturer's own profile to get their department ─────────────────
  const lecturer = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      departmentId: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // ── Levels: only levels assigned to this lecturer by admin ───────────────
  // We look for a LecturerLevel join table; if none exists fall back to
  // all levels (admin assigns them). Adjust the model name if yours differs.
  let levels: Array<{ id: number; level: number; name: string | null }> = [];
  try {
    // Try lecturer-specific level assignments first
    const lecturerLevels = await (prisma as any).lecturerLevel?.findMany?.({
      where: { lecturerId: user.id },
      select: { level: { select: { id: true, level: true, name: true } } },
      orderBy: { level: { level: 'asc' } },
    });
    if (lecturerLevels && lecturerLevels.length > 0) {
      levels = lecturerLevels.map((ll: any) => ll.level);
    } else {
      throw new Error('fallback');
    }
  } catch {
    // Fallback: all levels (if no lecturer-level join table)
    levels = await prisma.level.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, level: true, name: true },
    });
  }

  // ── Departments: lecturer's own department only ───────────────────────────
  // A lecturer belongs to one department. We expose only that department
  // so the scope picker is pre-filtered. If they have no department, show all.
  let departments: Array<{ id: string; name: string; code: string }> = [];
  if (lecturer?.department) {
    departments = [lecturer.department];
  } else {
    departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  // ── Available academic semesters (for the session/semester dropdown) ──────
  const semesters = await prisma.academicSemester.findMany({
    orderBy: [{ session: 'desc' }, { semester: 'asc' }],
    select: {
      id: true,
      session: true,
      semester: true,
      label: true,
      isActive: true,
    },
  });

  const activeSemester = semesters.find(s => s.isActive) ?? semesters[0] ?? null;

  // ── Courses for this lecturer ─────────────────────────────────────────────
  const courses = await getCoursesForLecturer(user);

  return {
    courses,
    levels,
    departments,
    semesters,                                    // full list for dropdown
    defaultSession:  activeSemester?.session  ?? '',
    defaultSemester: activeSemester?.semester ?? 1,
    activeSemesterId: activeSemester?.id ?? null,
    lecturerDepartmentId: lecturer?.departmentId ?? null,
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