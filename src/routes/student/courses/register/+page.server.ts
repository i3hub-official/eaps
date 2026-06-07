// src/routes/(student)/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';
import { error, fail } from '@sveltejs/kit';

const MAX_CREDITS   = 24;
const MAX_CARRY_OVER = 6;
const MAX_BORROWED   = 6;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
  const studentId = user.id;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      level:      true,
      department: { select: { id: true, name: true, code: true, collegeId: true } },
      college:    { select: { id: true, name: true } },
    },
  });

  if (!student?.departmentId || !student.levelId || !student.level) {
    throw error(400, 'Student profile incomplete. Please update your department and level.');
  }

  const currentSession  = user.session ?? '2024/2025';
  const studentLevel    = student.level.level;
  // semester derived from level: odd levels → sem 1, even → sem 2
  const currentSemester = studentLevel % 2 === 0 ? 2 : 1;

  // ── Current registrations ─────────────────────────────────────────────────
  const currentRegistrations = await prisma.courseRegistration.findMany({
    where: { studentId, session: currentSession, semester: currentSemester },
    include: {
      course: {
        include: { department: { select: { name: true, code: true } } },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const registeredCourseIds = currentRegistrations.map(r => r.courseId);
  const totalCreditUnits    = currentRegistrations.reduce((s, r) => s + r.course.creditUnits, 0);
  const carryOverCount      = currentRegistrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount       = currentRegistrations.filter(r => r.registrationType === 'borrowed').length;

  const excludeFilter = registeredCourseIds.length > 0
    ? { id: { notIn: registeredCourseIds } }
    : {};

  // ── All colleges ──────────────────────────────────────────────────────────
  const colleges = await prisma.college.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // ── All departments (for browsing) ────────────────────────────────────────
  const allDepartments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true, collegeId: true },
  });

  // ── All levels ────────────────────────────────────────────────────────────
  const allLevels = await prisma.level.findMany({
    orderBy: { level: 'asc' },
    select: { id: true, level: true, name: true },
  });

  // ── Normal courses: student's own dept, own level only ───────────────────
  const normalCourses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      level: studentLevel,
      ...excludeFilter,
    },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { code: 'asc' },
  });

  // ── Carry-over: student's own dept, strictly BELOW their level ───────────
  // Any course below the student's level in their department is a potential
  // carry-over (whether they failed it or never took it — institution decides).
  const carryOverCourses = studentLevel >= 200
    ? await prisma.course.findMany({
        where: {
          departmentId: student.departmentId,
          level: { lt: studentLevel },
          ...excludeFilter,
        },
        include: {
          department: { select: { name: true, code: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: [{ level: 'asc' }, { code: 'asc' }],
      })
    : [];

  // ── Borrowed: other depts in same college, same level only ───────────────
  const borrowedCourses = student.collegeId
    ? await prisma.course.findMany({
        where: {
          departmentId: { not: student.departmentId },
          department: { collegeId: student.collegeId },
          level: studentLevel,
          ...excludeFilter,
        },
        include: {
          department: { select: { name: true, code: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: { code: 'asc' },
      })
    : [];

  // ── Browse courses (filtered by college + dept + level on client) ─────────
  // We load ALL courses; the client filters live. Keep this lean with select.
  const browseCourses = await prisma.course.findMany({
    where: {
      // Only show levels the student is allowed to see:
      // own level, or below own level (carry-over range)
      level: { lte: studentLevel },
    },
    include: {
      department: {
        select: { id: true, name: true, code: true, collegeId: true },
      },
      _count: { select: { registrations: true } },
    },
    orderBy: [{ level: 'asc' }, { code: 'asc' }],
  });

  return {
    registrations: currentRegistrations,
    available: {
      normal:    normalCourses,
      carryOver: carryOverCourses,
      borrowed:  borrowedCourses,
    },
    browseCourses,
    colleges,
    allDepartments,
    allLevels,
    stats: {
      totalRegistered:  currentRegistrations.length,
      totalCreditUnits,
      maxCreditUnits:   MAX_CREDITS,
      carryOverCount,
      borrowedCount,
      maxCarryOver:     MAX_CARRY_OVER,
      maxBorrowed:      MAX_BORROWED,
      currentSession,
      currentSemester,
      studentLevel,
      studentDeptId:    student.departmentId,
      studentCollegeId: student.collegeId,
    },
    departments: allDepartments,
  };
};

export const actions: Actions = {
  register: async ({ request, locals }) => {
    const user      = requireStudent(locals.user);
    const studentId = user.id;
    const fd        = await request.formData();

    const courseId = fd.get('courseId')?.toString();
    const regType  = (fd.get('registrationType')?.toString() || 'normal') as
      'normal' | 'carry_over' | 'borrowed';

    if (!courseId) return fail(400, { message: 'Course ID is required' });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { departmentId: true, levelId: true, level: true, collegeId: true },
    });

    if (!student?.departmentId || !student.level) {
      return fail(400, { message: 'Student profile incomplete' });
    }

    const studentLevel    = student.level.level;
    const currentSession  = user.session ?? '2024/2025';
    const currentSemester = studentLevel % 2 === 0 ? 2 : 1;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) return fail(404, { message: 'Course not found' });

    // ── Block 100L from seeing/registering any course above their level ──────
    if (course.level > studentLevel) {
      return fail(400, { message: 'You cannot register for courses above your current level' });
    }

    // ── Duplicate check ───────────────────────────────────────────────────────
    const alreadyRegistered = await prisma.courseRegistration.findFirst({
      where: { studentId, courseId, session: currentSession, semester: currentSemester },
    });
    if (alreadyRegistered) {
      return fail(400, { message: 'Already registered for this course this semester' });
    }

    // ── Credit limit ───────────────────────────────────────────────────────────
    const currentRegs = await prisma.courseRegistration.findMany({
      where:   { studentId, session: currentSession, semester: currentSemester },
      include: { course: { select: { creditUnits: true } } },
    });

    const currentCredits    = currentRegs.reduce((s, r) => s + r.course.creditUnits, 0);
    const currentCarryOvers = currentRegs.filter(r => r.registrationType === 'carry_over').length;
    const currentBorrowed   = currentRegs.filter(r => r.registrationType === 'borrowed').length;

    if (currentCredits + course.creditUnits > MAX_CREDITS) {
      return fail(400, {
        message: `Credit limit exceeded (${currentCredits}/${MAX_CREDITS}). Cannot add ${course.creditUnits} more credits.`,
      });
    }

    // ── Type-specific validation ───────────────────────────────────────────────
    if (regType === 'carry_over') {
      if (studentLevel < 200) {
        return fail(400, { message: '100 Level students cannot register carry-over courses' });
      }
      if (course.level >= studentLevel) {
        return fail(400, { message: 'Carry-over courses must be from a level below yours' });
      }
      if (course.departmentId !== student.departmentId) {
        return fail(400, { message: 'Carry-over must be from your own department' });
      }
      if (currentCarryOvers >= MAX_CARRY_OVER) {
        return fail(400, { message: `Maximum ${MAX_CARRY_OVER} carry-over courses allowed` });
      }
    }

    if (regType === 'borrowed') {
      if (course.departmentId === student.departmentId) {
        return fail(400, { message: 'Cannot borrow from your own department' });
      }
      if (course.department.collegeId !== student.collegeId) {
        return fail(400, { message: 'Can only borrow from departments in your college' });
      }
      if (course.level !== studentLevel) {
        return fail(400, { message: 'Borrowed courses must be at your current level' });
      }
      if (currentBorrowed >= MAX_BORROWED) {
        return fail(400, { message: `Maximum ${MAX_BORROWED} borrowed courses allowed` });
      }
    }

    if (regType === 'normal') {
      if (course.departmentId !== student.departmentId) {
        return fail(400, { message: 'Normal courses must be from your own department' });
      }
      if (course.level !== studentLevel) {
        return fail(400, { message: 'Normal courses must be at your current level' });
      }
    }

    // ── Create registration ────────────────────────────────────────────────────
    try {
      await prisma.courseRegistration.create({
        data: {
          studentId,
          courseId,
          session:          currentSession,
          semester:         currentSemester,
          levelId:          student.levelId ?? undefined,
          registrationType: regType,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return fail(400, { message: 'Already registered for this course this semester' });
      }
      throw err;
    }

    const typeLabel = regType === 'carry_over' ? 'carry-over' : regType;
    return { success: true, message: `Registered for ${course.code} as ${typeLabel} course` };
  },

  drop: async ({ request, locals }) => {
    const user      = requireStudent(locals.user);
    const studentId = user.id;
    const fd        = await request.formData();
    const registrationId = fd.get('registrationId')?.toString();

    if (!registrationId) return fail(400, { message: 'Registration ID required' });

    const registration = await prisma.courseRegistration.findFirst({
      where:   { id: registrationId, studentId },
      include: { course: { select: { id: true, code: true, title: true } } },
    });

    if (!registration) return fail(404, { message: 'Registration not found' });

    const activeExam = await prisma.exam.findFirst({
      where: { courseId: registration.course.id, status: { in: ['active', 'completed'] } },
    });

    if (activeExam) {
      return fail(400, { message: 'Cannot drop — exam is active or already completed' });
    }

    await prisma.courseRegistration.delete({ where: { id: registrationId } });

    return {
      success: true,
      message: `Dropped ${registration.course.code}: ${registration.course.title}`,
    };
  },
};