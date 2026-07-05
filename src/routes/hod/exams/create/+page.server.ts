// src/routes/hod/exams/create/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireHod } from '$lib/server/auth/guards.js';
import { createExam, getActiveAcademicSemester, getCoursesForHod } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';
import { canSubmitQuestions } from '$lib/server/academic/exam-authority-gate.js';
import type { CreateExamPageData } from '$lib/types/exam.js';

export const load: PageServerLoad = async (event) => {
  const user = requireHod(event.locals.user);
  const prisma = await getPrismaClient();
  const departmentId = user.departmentId!;

  const department = await prisma.department.findUniqueOrThrow({
    where: { id: departmentId },
    select: { collegeId: true },
  });
  const collegeId = department.collegeId;

  const [courses, levels, departments, semesterRows, activeSemester] = await Promise.all([
    getCoursesForHod({ departmentId }),
    prisma.level.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, level: true },
    }).then(rows => rows.map(r => ({ id: String(r.id), name: r.name || `${r.level} Level`, value: r.level }))),
    prisma.department.findMany({ where: { collegeId }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
    prisma.academicSemester.findMany({
      orderBy: { session: 'desc' },
      select: { id: true, session: true, semester: true, isActive: true },
    }),
    getActiveAcademicSemester(),
  ]);

  const currentYear = new Date().getFullYear();
  const derivedSession = activeSemester?.session ?? semesterRows[0]?.session ?? `${currentYear}/${currentYear + 1}`;

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
      { id: 'next', session: `${currentYear + 1}/${currentYear + 2}` },
    );
  }

  const gateByCourseId: Record<string, { allowed: boolean; scope: string; activeHolderName: string | null }> = {};

  await Promise.all(
    courses.map(async (course: any) => {
      const offering = await prisma.courseOffering.findFirst({
        where: { courseId: course.id, status: 'open' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!offering) {
        gateByCourseId[course.id] = { allowed: false, scope: 'department_coordinator', activeHolderName: null };
        return;
      }

      gateByCourseId[course.id] = await canSubmitQuestions({
        offeringId: offering.id,
        userId: user.id,
        userRole: 'hod',
        collegeId,
        departmentId,
      });
    })
  );

  const data: CreateExamPageData = {
    courses,
    levels,
    departments,
    sessions,
    defaultSession: activeSemester?.session ?? derivedSession,
    defaultSemester: activeSemester?.semester ?? 1,
    examTotal: 70,
    caTotal: 30,
    totalMarks: 100,
    gateByCourseId,
  };

  return data;
};

export const actions: Actions = {
  default: async (event) => {
    const user = event.locals.user;
    if (!user) throw redirect(303, '/login');
    if (user.role !== 'hod') throw error(403, 'HOD access only');

    const formData = await event.request.formData();
    const { values, errors } = parseExamForm(formData);

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: serialize(values) });
    }

    const prisma = await getPrismaClient();
    const department = await prisma.department.findUniqueOrThrow({
      where: { id: user.departmentId! },
      select: { collegeId: true },
    });

    const offering = await prisma.courseOffering.findFirst({
      where: { courseId: values.courseId, status: 'open' },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (offering) {
      const gate = await canSubmitQuestions({
        offeringId: offering.id,
        userId: user.id,
        userRole: 'hod',
        collegeId: department.collegeId,
        departmentId: user.departmentId!,
      });
      if (!gate.allowed) {
        return fail(403, {
          error: `Question submission for this course is currently assigned to ${gate.activeHolderName ?? 'someone else'}, set by the Dean.`,
          values: serialize(values),
        });
      }
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
      marksPerQuestion: values.marksPerQuestion,
      session: values.session,
      semester: values.semester,
      levels: values.levels,
      department: values.department,
    });

    throw redirect(303, `/hod/exams/${exam.id}`);
  },
};

function serialize(values: ReturnType<typeof parseExamForm>['values']) {
  return {
    ...values,
    scheduledStart: values.scheduledStart?.toISOString() ?? '',
    scheduledEnd: values.scheduledEnd?.toISOString() ?? '',
  };
}