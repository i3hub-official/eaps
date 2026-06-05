// src/routes/(student)/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';
import { error, fail } from '@sveltejs/kit';

const MAX_CREDITS = 24;

// Limits are now configurable per institution — set to high values or remove
const MAX_CARRY_OVER = 6;   // Increased from 3
const MAX_BORROWED = 6;     // Increased from 2

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
  const studentId = user.id;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      level: true,
      department: { select: { id: true, name: true, code: true, collegeId: true } },
      college: { select: { id: true, name: true } },
    },
  });

  if (!student?.departmentId || !student.levelId || !student.level) {
    throw error(400, 'Student profile incomplete. Please update your department and level.');
  }

  const currentSession = user.session ?? '2024/2025';
  const currentSemester = student.level.level % 2 === 0 ? 2 : 1;
  const studentLevel = student.level.level;

  // ── CURRENT REGISTRATIONS (this session + semester only) ─────────────
  const currentRegistrations = await prisma.courseRegistration.findMany({
    where: {
      studentId,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        include: {
          department: { select: { name: true, code: true } },
        },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const registeredCourseIds = currentRegistrations.map((r) => r.courseId);
  const totalCreditUnits = currentRegistrations.reduce((sum, r) => sum + r.course.creditUnits, 0);

  const carryOverCount = currentRegistrations.filter((r) => r.registrationType === 'carry_over').length;
  const borrowedCount = currentRegistrations.filter((r) => r.registrationType === 'borrowed').length;

  // ── HELPER: Build exclude filter ───────────────────────────────────────
  const excludeRegistered = registeredCourseIds.length > 0
    ? { notIn: registeredCourseIds }
    : undefined;

  // ── 2. NORMAL COURSES ────────────────────────────────────────────────
  const normalCourses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      level: studentLevel,
      ...(excludeRegistered && { id: excludeRegistered }),
    },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { code: 'asc' },
  });

  // ── 3. CARRY-OVER COURSES ────────────────────────────────────────────
  let carryOverCourses: Awaited<ReturnType<typeof prisma.course.findMany>> = [];
  if (studentLevel >= 200) {
    // Get ALL failed courses across ALL sessions (not just current)
    const failedResults = await prisma.examResult.findMany({
      where: {
        studentId,
        passed: false,
      },
      select: {
        exam: { select: { courseId: true } },
      },
      distinct: ['examId'],
    });

    const failedCourseIds = failedResults
      .map((f) => f.exam.courseId)
      .filter((id): id is string => Boolean(id));

    // Also exclude courses already PASSED in any session (no need to carry over)
    const passedResults = await prisma.examResult.findMany({
      where: {
        studentId,
        passed: true,
      },
      select: {
        exam: { select: { courseId: true } },
      },
      distinct: ['examId'],
    });

    const passedCourseIds = passedResults
      .map((p) => p.exam.courseId)
      .filter((id): id is string => Boolean(id));

    // Carry-over = failed AND not yet passed AND not currently registered
    const eligibleCarryOverIds = failedCourseIds.filter(
      (id) => !passedCourseIds.includes(id) && !registeredCourseIds.includes(id)
    );

    if (eligibleCarryOverIds.length > 0) {
      carryOverCourses = await prisma.course.findMany({
        where: {
          id: { in: eligibleCarryOverIds },
          level: { lt: studentLevel },
        },
        include: {
          department: { select: { name: true, code: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: [{ level: 'asc' }, { code: 'asc' }],
      });
    }
  }

  // ── 4. BORROWED COURSES ──────────────────────────────────────────────
  let borrowedCourses: Awaited<ReturnType<typeof prisma.course.findMany>> = [];
  if (student.collegeId) {
    borrowedCourses = await prisma.course.findMany({
      where: {
        departmentId: { not: student.departmentId },
        department: { collegeId: student.collegeId },
        level: studentLevel,
        ...(excludeRegistered && { id: excludeRegistered }),
      },
      include: {
        department: { select: { name: true, code: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  // ── 5. ALL DEPARTMENTS ───────────────────────────────────────────────
  const allDepartments = await prisma.department.findMany({
    where: { collegeId: student.collegeId ?? undefined },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  return {
    registrations: currentRegistrations,
    available: {
      normal: normalCourses,
      carryOver: carryOverCourses,
      borrowed: borrowedCourses,
    },
    stats: {
      totalRegistered: currentRegistrations.length,
      totalCreditUnits,
      maxCreditUnits: MAX_CREDITS,
      carryOverCount,
      borrowedCount,
      maxCarryOver: MAX_CARRY_OVER,
      maxBorrowed: MAX_BORROWED,
      currentSession,
      currentSemester,
      studentLevel,
    },
    departments: allDepartments,
  };
};

export const actions: Actions = {
  register: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const studentId = user.id;
    const formData = await request.formData();

    const courseId = formData.get('courseId')?.toString();
    const regType = (formData.get('registrationType')?.toString() || 'normal') as
      | 'normal'
      | 'carry_over'
      | 'borrowed';

    if (!courseId) return fail(400, { message: 'Course ID is required' });

    const currentSession = user.session ?? '2024/2025';
    const currentSemester = user.level ? (user.level.level % 2 === 0 ? 2 : 1) : 1;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { departmentId: true, levelId: true, level: true, collegeId: true },
    });

    if (!student?.departmentId || !student.level) {
      return fail(400, { message: 'Student profile incomplete' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) return fail(404, { message: 'Course not found' });

    // ── FIX: Explicit check for existing registration THIS session/semester ─
    const existingThisSemester = await prisma.courseRegistration.findFirst({
      where: {
        studentId,
        courseId,
        session: currentSession,
        semester: currentSemester,
      },
    });

    if (existingThisSemester) {
      return fail(400, { message: 'Already registered for this course this semester' });
    }

    // ── VALIDATION ───────────────────────────────────────────────────────
    const currentRegs = await prisma.courseRegistration.findMany({
      where: { studentId, session: currentSession, semester: currentSemester },
      include: { course: { select: { creditUnits: true } } },
    });

    const currentCredits = currentRegs.reduce((sum, r) => sum + r.course.creditUnits, 0);
    const currentCarryOvers = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
    const currentBorrowed = currentRegs.filter((r) => r.registrationType === 'borrowed').length;

    if (currentCredits + course.creditUnits > MAX_CREDITS) {
      return fail(400, {
        message: `Credit limit exceeded (${currentCredits}/${MAX_CREDITS} credits). Cannot add ${course.creditUnits} more credits.`,
      });
    }

    if (regType === 'carry_over') {
      if (student.level.level < 200) {
        return fail(400, { message: 'Carry-over courses only available from 200 level' });
      }
      if (currentCarryOvers >= MAX_CARRY_OVER) {
        return fail(400, { message: `Maximum ${MAX_CARRY_OVER} carry-over courses allowed` });
      }
      // Verify student actually failed this course AND hasn't passed it since
      const failedResult = await prisma.examResult.findFirst({
        where: { studentId, exam: { courseId }, passed: false },
      });
      if (!failedResult) {
        return fail(400, { message: 'You did not fail this course. Carry-over not applicable.' });
      }
      // Extra safety: ensure they haven't passed it in a later attempt
      const passedResult = await prisma.examResult.findFirst({
        where: { studentId, exam: { courseId }, passed: true },
      });
      if (passedResult) {
        return fail(400, { message: 'You have already passed this course. No carry-over needed.' });
      }
    }

    if (regType === 'borrowed') {
      if (currentBorrowed >= MAX_BORROWED) {
        return fail(400, { message: `Maximum ${MAX_BORROWED} borrowed courses allowed` });
      }
      if (course.departmentId === student.departmentId) {
        return fail(400, { message: 'Cannot borrow from your own department' });
      }
      if (course.department.collegeId !== student.collegeId) {
        return fail(400, { message: 'Can only borrow from departments in your college' });
      }
    }

    if (regType === 'normal') {
      if (course.departmentId !== student.departmentId) {
        return fail(400, { message: 'This course is not in your department' });
      }
      if (course.level !== student.level.level) {
        return fail(400, { message: 'This course is not for your current level' });
      }
    }

    // ── CREATE (use findFirst + create instead of findUnique to avoid constraint issues) ─
    try {
      await prisma.courseRegistration.create({
        data: {
          studentId,
          courseId,
          session: currentSession,
          semester: currentSemester,
          levelId: student.levelId ?? undefined,
          registrationType: regType,
        },
      });
    } catch (err: any) {
      // Handle P2002 (unique constraint) specifically
      if (err.code === 'P2002') {
        return fail(400, { message: 'Already registered for this course this semester' });
      }
      throw err;
    }

    const typeLabel = regType === 'carry_over' ? 'carry-over' : regType;
    return { success: true, message: `Registered for ${course.code} as ${typeLabel} course` };
  },

  drop: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const studentId = user.id;
    const formData = await request.formData();
    const registrationId = formData.get('registrationId')?.toString();

    if (!registrationId) return fail(400, { message: 'Registration ID required' });

    const registration = await prisma.courseRegistration.findFirst({
      where: { id: registrationId, studentId },
      include: { course: { select: { id: true, code: true, title: true } } },
    });

    if (!registration) return fail(404, { message: 'Registration not found' });

    const activeExam = await prisma.exam.findFirst({
      where: {
        courseId: registration.course.id,
        status: { in: ['active', 'completed'] },
      },
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