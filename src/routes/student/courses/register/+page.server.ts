// src/routes/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = requireStudent(locals.user);

  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  // Already registered courses
  const existingRegs = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: { course: { select: { code: true, title: true, creditUnits: true } } },
  });

  const registeredCourseIds = new Set(existingRegs.map(r => r.courseId));

  // Build OR conditions dynamically — only include valid ones
  const orConditions: any[] = [];
  if (user.departmentId) orConditions.push({ departmentId: user.departmentId });
  if (user.programmeId) orConditions.push({ programmeId: user.programmeId });
  if (user.level?.level != null) orConditions.push({ level: user.level.level });

  // Available courses for registration
  const availableCourses = await prisma.course.findMany({
    where: {
      semester: currentSemester,
      NOT: { id: { in: Array.from(registeredCourseIds) } },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    },
    include: {
      department: { select: { name: true } },
      programme: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { code: 'asc' },
  });

  // Pre-selected course from query param
  const preselected = url.searchParams.get('course');

  return {
    existingRegistrations: existingRegs.map(r => ({
      id: r.id,
      courseId: r.courseId,
      courseCode: r.course.code,
      courseTitle: r.course.title,
      creditUnits: r.course.creditUnits,
      registrationType: r.registrationType,
      registeredAt: r.createdAt,
    })),
    availableCourses: availableCourses.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      creditUnits: c.creditUnits,
      department: c.department?.name ?? '—',
      programme: c.programme?.name ?? '—',
      level: c.level ?? '—',
      semester: c.semester,
      registrationCount: c._count.registrations,
      preselected: c.id === preselected,
    })),
    meta: {
      session: currentSession,
      semester: currentSemester,
      maxCredits: 24,
      currentCredits: existingRegs.reduce((sum, r) => sum + r.course.creditUnits, 0),
    },
  };
};

export const actions: Actions = {
  register: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const form = await request.formData();
    const courseId = form.get('courseId')?.toString();
    const type = (form.get('type')?.toString() as 'normal' | 'carry_over' | 'borrowed') ?? 'normal';

    if (!courseId) return fail(400, { error: 'Course ID required' });

    const currentSession = user.session ?? deriveSessionFromDate();
    const currentSemester = deriveSemesterFromDate();

    // Check if already registered
    const existing = await prisma.courseRegistration.findUnique({
      where: {
        studentId_courseId_session_semester: {
          studentId: user.id,
          courseId,
          session: currentSession,
          semester: currentSemester,
        },
      },
    });
    if (existing) return fail(400, { error: 'Already registered for this course' });

    // Get course to check credits
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creditUnits: true },
    });
    if (!course) return fail(404, { error: 'Course not found' });

    // Check credit limit
    const totalRegistered = await prisma.courseRegistration.findMany({
      where: { studentId: user.id, session: currentSession, semester: currentSemester },
      include: { course: { select: { creditUnits: true } } },
    });
    const totalCredits = totalRegistered.reduce((s, r) => s + r.course.creditUnits, 0);
    if (totalCredits + course.creditUnits > 24) {
      return fail(400, { error: 'Credit limit exceeded (max 24 units)' });
    }

    await prisma.courseRegistration.create({
      data: {
        studentId: user.id,
        courseId,
        session: currentSession,
        semester: currentSemester,
        registrationType: type,
        levelId: user.levelId ?? undefined,
      },
    });

    return { success: true };
  },

  drop: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const form = await request.formData();
    const registrationId = form.get('registrationId')?.toString();

    if (!registrationId) return fail(400, { error: 'Registration ID required' });

    // Verify ownership
    const reg = await prisma.courseRegistration.findFirst({
      where: { id: registrationId, studentId: user.id },
    });
    if (!reg) return fail(404, { error: 'Registration not found' });

    await prisma.courseRegistration.delete({ where: { id: registrationId } });
    return { success: true };
  },
};

function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 10) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}