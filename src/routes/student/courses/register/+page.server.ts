// src/routes/(student)/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';
import { error, fail } from '@sveltejs/kit';

const MAX_CREDITS    = 24;
const MAX_CARRY_OVER = 6;
const MAX_BORROWED   = 6;

export const load: PageServerLoad = async ({ locals }) => {
  const user      = requireStudent(locals.user);
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
  const currentSemester = studentLevel % 2 === 0 ? 2 : 1;

  // CRITICAL FIX: Fallback to department's college if user.collegeId is null
  const collegeId = student.collegeId ?? student.department?.collegeId ?? null;

  if (!collegeId) {
    throw error(400, 'Student college not assigned. Please update your profile.');
  }

  // ── Current registrations ─────────────────────────────────────────────────
  const currentRegistrations = await prisma.courseRegistration.findMany({
    where:   { studentId, session: currentSession, semester: currentSemester },
    include: {
      course: {
        include: {
          department: { select: { id: true, name: true, code: true, collegeId: true } },
        },
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

  // ── NORMAL: same college, exact level ───────────────────────────────────
  const normalCourses = await prisma.course.findMany({
    where: {
      department: { collegeId },
      level: studentLevel,
      ...excludeFilter,
    },
    include: {
      department: { select: { id: true, name: true, code: true, collegeId: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: [{ department: { code: 'asc' } }, { code: 'asc' }],
  });

  // ── CARRY-OVER: same college, level < studentLevel ────────────────────────
  const carryOverCourses = studentLevel >= 200
    ? await prisma.course.findMany({
        where: {
          department: { collegeId },
          level: { lt: studentLevel },
          ...excludeFilter,
        },
        include: {
          department: { select: { id: true, name: true, code: true, collegeId: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: [{ level: 'asc' }, { department: { code: 'asc' } }, { code: 'asc' }],
      })
    : [];

  // ── BORROWED: outside college, exact level ────────────────────────────────
  const borrowedCourses = await prisma.course.findMany({
    where: {
      department: { collegeId: { not: collegeId } },
      level: studentLevel,
      ...excludeFilter,
    },
    include: {
      department: {
        select: {
          id: true, name: true, code: true, collegeId: true,
          college: { select: { id: true, name: true } },
        },
      },
      _count: { select: { registrations: true } },
    },
    orderBy: [{ department: { college: { name: 'asc' } } }, { department: { code: 'asc' } }, { code: 'asc' }],
  });

  // ── BROWSE ALL: all courses ≤ studentLevel, excluding already registered ──
  const browseAllCourses = await prisma.course.findMany({
    where: {
      level: { lte: studentLevel },
      ...excludeFilter,
    },
    include: {
      department: {
        select: {
          id: true, name: true, code: true, collegeId: true,
          college: { select: { id: true, name: true } },
        },
      },
      _count: { select: { registrations: true } },
    },
    orderBy: [{ level: 'asc' }, { department: { college: { name: 'asc' } } }, { department: { code: 'asc' } }, { code: 'asc' }],
  });

  return {
    registrations: currentRegistrations,
    available: {
      normal:    normalCourses,
      carryOver: carryOverCourses,
      borrowed:  borrowedCourses,
      browseAll: browseAllCourses,
    },
    student: {
      collegeId:   collegeId,
      collegeName: student.college?.name ?? '',
      deptId:      student.departmentId,
      deptName:    student.department?.name ?? '',
      level:       studentLevel,
    },
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
    },
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
      where:  { id: studentId },
      select: { departmentId: true, levelId: true, level: true, collegeId: true },
    });

    if (!student?.level || !student.departmentId) {
      return fail(400, { message: 'Student profile incomplete' });
    }

    const studentLevel    = student.level.level;
    const currentSession  = user.session ?? '2024/2025';
    const currentSemester = studentLevel % 2 === 0 ? 2 : 1;

    // CRITICAL FIX: Also fix in actions - fallback to department's college
    const collegeId = student.collegeId ?? await prisma.department.findUnique({
      where: { id: student.departmentId },
      select: { collegeId: true },
    }).then(d => d?.collegeId ?? null);

    if (!collegeId) {
      return fail(400, { message: 'Student college not assigned. Please update your profile.' });
    }

    const course = await prisma.course.findUnique({
      where:   { id: courseId },
      include: { department: { select: { collegeId: true, id: true } } },
    });

    if (!course) return fail(404, { message: 'Course not found' });
    if (course.level == null) return fail(400, { message: 'Course level is not specified' });

    // Hard block: cannot register above your level
    if (course.level > studentLevel) {
      return fail(400, { message: 'You cannot register courses above your current level' });
    }

    // Duplicate check
    const alreadyRegistered = await prisma.courseRegistration.findFirst({
      where: { studentId, courseId, session: currentSession, semester: currentSemester },
    });
    if (alreadyRegistered) {
      return fail(400, { message: 'Already registered for this course this semester' });
    }

    // Credit limit
    const currentRegs = await prisma.courseRegistration.findMany({
      where:   { studentId, session: currentSession, semester: currentSemester },
      include: { course: { select: { creditUnits: true } } },
    });
    const currentCredits    = currentRegs.reduce((s, r) => s + r.course.creditUnits, 0);
    const currentCarryOvers = currentRegs.filter(r => r.registrationType === 'carry_over').length;
    const currentBorrowed   = currentRegs.filter(r => r.registrationType === 'borrowed').length;

    if (currentCredits + course.creditUnits > MAX_CREDITS) {
      return fail(400, {
        message: `Credit limit exceeded (${currentCredits}/${MAX_CREDITS}). Cannot add ${course.creditUnits} more.`,
      });
    }

    const sameCollege = course.department.collegeId === collegeId;

    // Auto-infer and validate registration type
    let finalRegType: 'normal' | 'carry_over' | 'borrowed';

    if (sameCollege) {
      if (course.level === studentLevel) {
        finalRegType = 'normal';
      } else if (course.level < studentLevel) {
        if (studentLevel < 200) {
          return fail(400, { message: '100 Level students cannot register carry-over courses' });
        }
        if (currentCarryOvers >= MAX_CARRY_OVER) {
          return fail(400, { message: `Maximum ${MAX_CARRY_OVER} carry-over courses allowed` });
        }
        finalRegType = 'carry_over';
      } else {
        return fail(400, { message: 'Course level mismatch' });
      }
    } else {
      if (course.level !== studentLevel) {
        return fail(400, { message: 'Borrowed courses must be at your current level' });
      }
      if (currentBorrowed >= MAX_BORROWED) {
        return fail(400, { message: `Maximum ${MAX_BORROWED} borrowed courses allowed` });
      }
      finalRegType = 'borrowed';
    }

    try {
      await prisma.courseRegistration.create({
        data: {
          studentId,
          courseId,
          session:          currentSession,
          semester:         currentSemester,
          levelId:          student.levelId ?? undefined,
          registrationType: finalRegType,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') return fail(400, { message: 'Already registered for this course this semester' });
      throw err;
    }

    const label = finalRegType === 'carry_over' ? 'carry-over' : finalRegType;
    return { success: true, message: `Registered ${course.code} as ${label} course` };
  },

  drop: async ({ request, locals }) => {
    const user      = requireStudent(locals.user);
    const studentId = user.id;
    const fd        = await request.formData();
    const registrationId = fd.get('registrationId')?.toString();

    if (!registrationId) return fail(400, { message: 'Registration ID required' });

    const reg = await prisma.courseRegistration.findFirst({
      where:   { id: registrationId, studentId },
      include: { course: { select: { id: true, code: true, title: true } } },
    });

    if (!reg) return fail(404, { message: 'Registration not found' });

    const activeExam = await prisma.exam.findFirst({
      where: { courseId: reg.course.id, status: { in: ['active', 'completed'] } },
    });
    if (activeExam) return fail(400, { message: 'Cannot drop — exam is active or already completed' });

    await prisma.courseRegistration.delete({ where: { id: registrationId } });
    return { success: true, message: `Dropped ${reg.course.code}: ${reg.course.title}` };
  },
};