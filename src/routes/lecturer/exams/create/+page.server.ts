// src/routes/lecturer/exams/create/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireExamCreator } from '$lib/server/auth/guards.js';
import { createExam, getActiveAcademicSemester, getCoursesForLecturer } from '$lib/server/db/exams.js';
import { parseExamForm } from '$lib/server/exam/exam-form.js';
import { canSubmitQuestions } from '$lib/server/academic/exam-authority-gate.js';
import type { CreateExamPageData, ExamAuthorityGate } from '$lib/types/exam.js';

export const load: PageServerLoad = async (event) => {
  // ✅ Use the new guard - allows lecturers, department coordinators, exam officers, and HODs
  const user = requireExamCreator(event.locals.user);
  const prisma = await getPrismaClient();

  // Get courses based on user role
  let courses;
  if (user.role === 'exam_officer') {
    // Exam officers can see all courses in their college
    courses = await prisma.course.findMany({
      where: {
        offerings: {
          some: {
            departments: {
              some: {
                department: {
                  collegeId: user.collegeId
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        code: true,
        title: true,
        offerings: {
          where: { status: 'open' },
          select: { id: true },
          take: 1
        }
      },
      orderBy: { code: 'asc' }
    });
  } else {
    // Lecturers, department coordinators, and HODs see courses in their department
    courses = await getCoursesForLecturer({ 
      departmentId: user.departmentId ?? null 
    });
  }

  const [levels, departments, semesterRows, activeSemester] = await Promise.all([
    prisma.level.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, level: true },
    }).then(rows => rows.map(r => ({ id: String(r.id), name: r.name || `${r.level} Level`, value: r.level }))),
    prisma.department.findMany({ 
      where: user.collegeId ? { collegeId: user.collegeId } : {},
      orderBy: { name: 'asc' }, 
      select: { id: true, name: true, code: true } 
    }),
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

  // Resolve each course to its active offering, then compute the gate per course.
  const gateByCourseId: Record<string, ExamAuthorityGate> = {};

  await Promise.all(
    courses.map(async (course: any) => {
      const offering = await prisma.courseOffering.findFirst({
        where: { courseId: course.id, status: 'open' },
        select: { 
          id: true, 
          departments: { 
            select: { 
              department: { 
                select: { 
                  collegeId: true,
                  id: true 
                } 
              } 
            }, 
            take: 1 
          } 
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!offering || !offering.departments[0]) {
        // No open offering yet for this course — default to allowed
        gateByCourseId[course.id] = { allowed: true, scope: 'lecturer', activeHolderName: null };
        return;
      }

      const collegeId = offering.departments[0].department.collegeId;
      const departmentId = offering.departments[0].department.id;
      
      // ✅ Use the actual user's role
      gateByCourseId[course.id] = await canSubmitQuestions({
        offeringId: offering.id,
        userId: user.id,
        userRole: user.role,
        collegeId,
        departmentId: user.departmentId || departmentId,
      });
    })
  );

  const data: CreateExamPageData = {
    courses: courses.map((c: any) => ({
      id: c.id,
      code: c.code,
      title: c.title
    })),
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
    // ✅ Use the new guard
    const user = requireExamCreator(event.locals.user);

    const formData = await event.request.formData();
    const { values, errors } = parseExamForm(formData);

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: serialize(values) });
    }

    const prisma = await getPrismaClient();
    const offering = await prisma.courseOffering.findFirst({
      where: { courseId: values.courseId, status: 'open' },
      select: { 
        id: true, 
        departments: { 
          select: { 
            department: { 
              select: { 
                collegeId: true,
                id: true 
              } 
            } 
          }, 
          take: 1 
        } 
      },
      orderBy: { createdAt: 'desc' },
    });

    if (offering && offering.departments[0]) {
      const collegeId = offering.departments[0].department.collegeId;
      const departmentId = offering.departments[0].department.id;
      
      // ✅ Use the actual user's role
      const gate = await canSubmitQuestions({
        offeringId: offering.id,
        userId: user.id,
        userRole: user.role,
        collegeId,
        departmentId: user.departmentId || departmentId,
      });
      
      if (!gate.allowed) {
        return fail(403, {
          error: `Question submission for this course is currently assigned to ${gate.activeHolderName ?? 'someone else'}, set by the Dean.`,
          values: serialize(values),
        });
      }
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