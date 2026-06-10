// src/routes/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

const MAX_CREDITS = 24;

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
  const user = requireStudent(locals.user);

  const currentSession   = user.session ?? deriveSessionFromDate();
  const currentSemester  = deriveSemesterFromDate();
  const studentCollegeId = user.collegeId ?? null;

  // Resolve level number and college name from scalar IDs
  const [levelRow, collegeRow] = await Promise.all([
    user.levelId
      ? prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
      : null,
    studentCollegeId
      ? prisma.college.findUnique({ where: { id: studentCollegeId }, select: { name: true } })
      : null,
  ]);
  const studentLevel = levelRow?.level ?? 100;

  // ── Already-registered course IDs ────────────────────────────────────────
  const existingRegs = await prisma.courseRegistration.findMany({
    where: { studentId: user.id, session: currentSession, semester: currentSemester },
    include: {
      course: {
        select: {
          code: true, title: true, creditUnits: true, level: true,
          department: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const registeredIds  = new Set(existingRegs.map(r => r.courseId));
  const currentCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

  // ── Lock check: student has already submitted their registration ──────────
  // A student is "locked" once they have at least one approved normal course.
  // After locking, only admins can make changes.
  const isLocked = existingRegs.some(
    r => r.status === 'approved' && r.registrationType === 'normal',
  );

  // ── Shared dept include ───────────────────────────────────────────────────
  const deptInclude = {
    select: {
      id: true, name: true, code: true, collegeId: true,
      college: { select: { id: true, name: true, abbreviation: true } },
    },
  } as const;

  const notRegistered = { NOT: { id: { in: Array.from(registeredIds) } } } as const;

  // ── 1. COLLEGE COURSES — same college, same level ─────────────────────────
  const collegeCourses = studentCollegeId
    ? await prisma.course.findMany({
        where: { ...notRegistered, level: studentLevel, department: { collegeId: studentCollegeId } },
        include: { department: deptInclude, _count: { select: { registrations: true } } },
        orderBy: { code: 'asc' },
      })
    : [];

  // ── 2. CARRY-OVER COURSES — same college, any level BELOW student level ───
  const carryOverCourses = (studentCollegeId && studentLevel > 100)
    ? await prisma.course.findMany({
        where: { ...notRegistered, level: { lt: studentLevel }, department: { collegeId: studentCollegeId } },
        include: { department: deptInclude, _count: { select: { registrations: true } } },
        orderBy: [{ level: 'desc' }, { code: 'asc' }],
      })
    : [];

  // ── 3. BORROWED COURSES — different college, same level only ─────────────
  const borrowedCourses = await prisma.course.findMany({
    where: {
      ...notRegistered,
      level: studentLevel,
      department: { collegeId: { not: studentCollegeId ?? undefined } },
    },
    include: { department: deptInclude, _count: { select: { registrations: true } } },
    orderBy: [{ department: { collegeId: 'asc' } }, { code: 'asc' }],
  });

  const preselected = url.searchParams.get('course') ?? null;

  type CourseWithDept = (typeof collegeCourses)[number];
  const serialize = (c: CourseWithDept) => ({
    id: c.id, code: c.code, title: c.title,
    creditUnits: c.creditUnits, level: c.level, semester: c.semester,
    department: c.department.name, departmentCode: c.department.code,
    college: c.department.college?.name ?? '—',
    collegeAbbr: c.department.college?.abbreviation ?? '—',
    registrationCount: c._count.registrations,
    preselected: c.id === preselected,
  });

  return {
    existingRegistrations: existingRegs.map(r => ({
      id: r.id, courseId: r.courseId,
      courseCode: r.course.code, courseTitle: r.course.title,
      creditUnits: r.course.creditUnits, level: r.course.level,
      department: r.course.department?.name ?? '—',
      registrationType: r.registrationType, status: r.status,
      registeredAt: r.createdAt,
    })),
    collegeCourses:   collegeCourses.map(serialize),
    carryOverCourses: carryOverCourses.map(serialize),
    borrowedCourses:  borrowedCourses.map(serialize),
    meta: {
      session: currentSession, semester: currentSemester,
      maxCredits: MAX_CREDITS, currentCredits,
      studentLevel, studentCollege: collegeRow?.name ?? null,
      isLocked,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const actions: Actions = {
  register: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const fd   = await request.formData();

    const courseId = fd.get('courseId')?.toString();
    const rawType  = fd.get('type')?.toString() ?? 'normal';
    const type     = (['normal', 'carry_over', 'borrowed'] as const).includes(rawType as any)
      ? (rawType as 'normal' | 'carry_over' | 'borrowed')
      : 'normal';

    if (!courseId) return fail(400, { error: 'Course ID required.' });

    const currentSession   = user.session ?? deriveSessionFromDate();
    const currentSemester  = deriveSemesterFromDate();
    const studentCollegeId = user.collegeId ?? null;

    const levelRow     = user.levelId
      ? await prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
      : null;
    const studentLevel = levelRow?.level ?? 100;

    // ── Lock check ─────────────────────────────────────────────────────────
    const existingRegs = await prisma.courseRegistration.findMany({
      where: { studentId: user.id, session: currentSession, semester: currentSemester },
      select: { status: true, registrationType: true, courseId: true, course: { select: { creditUnits: true } } },
    });

    const isLocked = existingRegs.some(
      r => r.status === 'approved' && r.registrationType === 'normal',
    );
    if (isLocked) {
      return fail(403, { error: 'Your registration has been submitted and locked. Contact your academic office to make changes.' });
    }

    // ── Duplicate check ────────────────────────────────────────────────────
    const alreadyRegistered = existingRegs.some(r => r.courseId === courseId);
    if (alreadyRegistered) return fail(400, { error: 'Already registered for this course.' });

    // ── Course + college ───────────────────────────────────────────────────
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: { select: { collegeId: true } } },
    });
    if (!course) return fail(404, { error: 'Course not found.' });

    const courseLevel     = course.level ?? 0;
    const courseCollegeId = course.department.collegeId;
    const sameCollege     = courseCollegeId === studentCollegeId;

    // ── Type validation ────────────────────────────────────────────────────
    if (type === 'normal') {
      if (!sameCollege)
        return fail(400, { error: 'Normal registration is only for courses in your own college.' });
      if (courseLevel !== studentLevel)
        return fail(400, { error: 'Normal registration is only for courses at your current level.' });
    }
    if (type === 'carry_over') {
      if (!sameCollege)
        return fail(400, { error: 'Carry-over registration is only for courses in your own college.' });
      if (studentLevel <= 100)
        return fail(400, { error: '100 Level students cannot register carry-over courses.' });
      if (courseLevel >= studentLevel)
        return fail(400, { error: 'Carry-over courses must be from a level below your current level.' });
    }
    if (type === 'borrowed') {
      if (sameCollege)
        return fail(400, { error: 'Borrowed registration is only for courses from other colleges.' });
      if (courseLevel !== studentLevel)
        return fail(400, { error: 'Borrowed courses must be at your current level.' });
    }

    // ── Credit cap ─────────────────────────────────────────────────────────
    const usedCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);
    if (usedCredits + course.creditUnits > MAX_CREDITS) {
      return fail(400, { error: `Credit limit exceeded. You have ${MAX_CREDITS - usedCredits} unit(s) remaining.` });
    }

    // Borrowed courses are auto-approved; carry-over and normal need approval
    const status = type === 'borrowed' ? 'approved' : type === 'normal' ? 'approved' : 'pending';

    await prisma.courseRegistration.create({
      data: {
        studentId: user.id, courseId,
        session: currentSession, semester: currentSemester,
        registrationType: type, status,
        levelId: user.levelId ?? undefined,
      },
    });

    return { success: true };
  },

  drop: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const fd   = await request.formData();
    const registrationId = fd.get('registrationId')?.toString();

    if (!registrationId) return fail(400, { error: 'Registration ID required.' });

    const reg = await prisma.courseRegistration.findFirst({
      where: { id: registrationId, studentId: user.id },
    });
    if (!reg) return fail(404, { error: 'Registration not found.' });

    // Lock check — if ANY normal reg is approved, the whole set is locked
    const currentSession  = user.session ?? deriveSessionFromDate();
    const currentSemester = deriveSemesterFromDate();
    const locked = await prisma.courseRegistration.findFirst({
      where: {
        studentId: user.id, session: currentSession, semester: currentSemester,
        status: 'approved', registrationType: 'normal',
      },
    });
    if (locked) {
      return fail(403, { error: 'Your registration is locked. Contact your academic office to drop a course.' });
    }

    await prisma.courseRegistration.delete({ where: { id: registrationId } });
    return { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}