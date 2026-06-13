// src/routes/admin/manage/course-registrations/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

// Default fallback values (only used when no config exists)
const DEFAULT_MAX_CARRY_OVER = 6;
const DEFAULT_MAX_BORROWED = 6;
const DEFAULT_MAX_CREDITS = 24;

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

      const prisma = await getPrismaClient();


  const studentId = url.searchParams.get('studentId') ?? undefined;
  const currentSemester = 1; // fallback semester for config lookup

  // Get the admin's level ID for config lookup (or use default)
  const adminLevelId = locals.user?.levelId ?? null;
  
  let maxCredits = DEFAULT_MAX_CREDITS;
  let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
  let maxBorrowed = DEFAULT_MAX_BORROWED;

  // Only fetch config if we have a levelId and the model exists
  if (adminLevelId) {
    try {
      const configRow = await prisma.levelSemesterConfig.findUnique({
        where: {
          levelId_semester: {
            levelId: adminLevelId,
            semester: currentSemester,
          },
        },
        select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
      });

      if (configRow) {
        maxCredits = configRow.maxCredits ?? DEFAULT_MAX_CREDITS;
        maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
        maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
      }
    } catch (err) {
      // Model might not exist yet - use defaults
      console.warn('Could not fetch LevelSemesterConfig, using defaults:', err);
    }
  }

  const [registrations, students, courses, levels, colleges] = await Promise.all([
    prisma.courseRegistration.findMany({
      where: studentId ? { studentId } : undefined,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            matricNumber: true,
            departmentId: true,
            collegeId: true,
            level: { select: { level: true, name: true } },
            department: { select: { id: true, name: true, code: true } },
          },
        },
        course: { include: { department: { select: { id: true, name: true, code: true, collegeId: true } } } },
        level: { select: { level: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: studentId ? undefined : 200,
    }),
    prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: {
        id: true,
        fullName: true,
        matricNumber: true,
        email: true,
        collegeId: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        level: { select: { id: true, level: true, name: true } },
        session: true,
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.course.findMany({
      include: { department: { select: { id: true, name: true, code: true, collegeId: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.level.findMany({ orderBy: { level: 'asc' } }),
    prisma.college.findMany({ orderBy: { name: 'asc' } }),
  ]);

  // If a student is selected, compute what courses are available for borrow/carry-over
  let studentAvailableCourses: {
    normal: typeof courses;
    carryOver: typeof courses;
    borrowed: typeof courses;
  } | null = null;

  if (studentId) {
    const student = students.find((s) => s.id === studentId);
    if (student && student.level && student.departmentId) {
      const studentLevel = student.level.level;
      const currentSession = student.session ?? '2025/2026';
      const currentSemester = studentLevel % 2 === 0 ? 2 : 1;

      // Get student's config for limits
      let studentMaxCarryOver = DEFAULT_MAX_CARRY_OVER;
      let studentMaxBorrowed = DEFAULT_MAX_BORROWED;
      
      try {
        const studentConfig = await prisma.levelSemesterConfig.findUnique({
          where: {
            levelId_semester: {
              levelId: student.level.id,
              semester: currentSemester,
            },
          },
          select: { maxCarryOver: true, maxBorrowed: true },
        });
        
        if (studentConfig) {
          studentMaxCarryOver = studentConfig.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
          studentMaxBorrowed = studentConfig.maxBorrowed ?? DEFAULT_MAX_BORROWED;
        }
      } catch (err) {
        // Model might not exist - use defaults
        console.warn('Could not fetch student config, using defaults:', err);
      }

      const currentRegs = await prisma.courseRegistration.findMany({
        where: { studentId, session: currentSession, semester: currentSemester },
        select: { courseId: true, registrationType: true },
      });
      const registeredIds = currentRegs.map((r) => r.courseId);
      
      // Count current carry-over and borrowed registrations
      const currentCarryOverCount = currentRegs.filter(r => r.registrationType === 'carry_over').length;
      const currentBorrowedCount = currentRegs.filter(r => r.registrationType === 'borrowed').length;

      // Normal
      const normalCourses = courses.filter(
        (c) =>
          c.departmentId === student.departmentId &&
          c.level === studentLevel &&
          !registeredIds.includes(c.id)
      );

      // Carry-over (only if student hasn't reached limit)
      let carryOverCourses: typeof courses = [];
      if (studentLevel >= 200 && currentCarryOverCount < studentMaxCarryOver) {
        const [failedResults, passedResults] = await Promise.all([
          prisma.examResult.findMany({
            where: { studentId, passed: false },
            select: { exam: { select: { courseId: true } } },
            distinct: ['examId'],
          }),
          prisma.examResult.findMany({
            where: { studentId, passed: true },
            select: { exam: { select: { courseId: true } } },
            distinct: ['examId'],
          }),
        ]);

        const failedIds = failedResults.map((f) => f.exam.courseId).filter(Boolean) as string[];
        const passedIds = passedResults.map((p) => p.exam.courseId).filter(Boolean) as string[];
        const eligibleIds = failedIds.filter(
          (id) => !passedIds.includes(id) && !registeredIds.includes(id)
        );

        carryOverCourses = courses.filter(
          (c) => eligibleIds.includes(c.id) && c.level !== null && c.level < studentLevel
        );
      }

      // Borrowed (only if student hasn't reached limit)
      let borrowedCourses: typeof courses = [];
      if (student.collegeId != null && currentBorrowedCount < studentMaxBorrowed) {
        borrowedCourses = courses.filter(
          (c) =>
            c.departmentId !== student.departmentId &&
            c.department.collegeId === student.collegeId &&
            c.level === studentLevel &&
            !registeredIds.includes(c.id)
        );
      }

      studentAvailableCourses = {
        normal: normalCourses,
        carryOver: carryOverCourses,
        borrowed: borrowedCourses,
      };
    }
  }

  return {
    registrations,
    students,
    courses,
    levels,
    colleges,
    selectedStudentId: studentId ?? null,
    studentAvailableCourses,
    limits: {
      maxCredits,
      maxCarryOver,
      maxBorrowed,
    },
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();

            const prisma = await getPrismaClient();


    const studentId = data.get('studentId') as string;
    const courseId = data.get('courseId') as string;
    const session = data.get('session') as string;
    const semester = parseInt(data.get('semester') as string);
    const registrationType = (data.get('registrationType') as string) || 'normal';
    const levelId = data.get('levelId') ? parseInt(data.get('levelId') as string) : null;

    if (!studentId) return fail(400, { error: 'Student selection is required' });
    if (!courseId) return fail(400, { error: 'Course selection is required' });
    if (!session) return fail(400, { error: 'Session is required' });
    if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

    // Get the student's level for config lookup
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { levelId: true },
    });

    if (!student) return fail(404, { error: 'Student not found' });

    // Fetch config limits for this student's level and semester
    let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
    let maxBorrowed = DEFAULT_MAX_BORROWED;

    if (student.levelId) {
      try {
        const configRow = await prisma.levelSemesterConfig.findUnique({
          where: {
            levelId_semester: {
              levelId: student.levelId,
              semester: semester,
            },
          },
          select: { maxCarryOver: true, maxBorrowed: true },
        });

        if (configRow) {
          maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
          maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
        }
      } catch (err) {
        console.warn('Could not fetch config for validation, using defaults:', err);
      }
    }

    // Carry-over / borrowed validations with config values
    if (registrationType === 'carry_over' || registrationType === 'borrowed') {
      const currentRegs = await prisma.courseRegistration.findMany({
        where: { studentId, session, semester },
        select: { registrationType: true },
      });

      if (registrationType === 'carry_over') {
        const coCount = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
        if (coCount >= maxCarryOver) {
          return fail(400, { error: `Carry-over limit (${maxCarryOver}) already reached for this student` });
        }
      }

      if (registrationType === 'borrowed') {
        const bCount = currentRegs.filter((r) => r.registrationType === 'borrowed').length;
        if (bCount >= maxBorrowed) {
          return fail(400, { error: `Borrowed course limit (${maxBorrowed}) already reached for this student` });
        }
      }
    }

    try {
      await prisma.courseRegistration.create({
        data: {
          studentId,
          courseId,
          session,
          semester,
          registrationType: registrationType as any,
          levelId: levelId ?? undefined,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return fail(400, { error: 'Student is already registered for this course in this session and semester' });
      }
      console.error(err);
      return fail(500, { error: 'Failed to create course registration' });
    }
    return { success: true, message: 'Course registration created successfully' };
  },

  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();

        const prisma = await getPrismaClient();


    const id = data.get('id') as string;
    const studentId = data.get('studentId') as string;
    const courseId = data.get('courseId') as string;
    const session = data.get('session') as string;
    const semester = parseInt(data.get('semester') as string);
    const registrationType = (data.get('registrationType') as string) || 'normal';
    const levelId = data.get('levelId') ? parseInt(data.get('levelId') as string) : null;

    if (!studentId) return fail(400, { error: 'Student selection is required' });
    if (!courseId) return fail(400, { error: 'Course selection is required' });
    if (!session) return fail(400, { error: 'Session is required' });
    if (isNaN(semester)) return fail(400, { error: 'Semester is required' });

    // For edit, we should re-validate limits based on the new registration type
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { levelId: true },
    });

    if (student?.levelId) {
      let maxCarryOver = DEFAULT_MAX_CARRY_OVER;
      let maxBorrowed = DEFAULT_MAX_BORROWED;

      try {
        const configRow = await prisma.levelSemesterConfig.findUnique({
          where: {
            levelId_semester: {
              levelId: student.levelId,
              semester: semester,
            },
          },
          select: { maxCarryOver: true, maxBorrowed: true },
        });

        if (configRow) {
          maxCarryOver = configRow.maxCarryOver ?? DEFAULT_MAX_CARRY_OVER;
          maxBorrowed = configRow.maxBorrowed ?? DEFAULT_MAX_BORROWED;
        }
      } catch (err) {
        console.warn('Could not fetch config for validation, using defaults:', err);
      }

      if (registrationType === 'carry_over' || registrationType === 'borrowed') {
        const currentRegs = await prisma.courseRegistration.findMany({
          where: { 
            studentId, 
            session, 
            semester,
            NOT: { id } // Exclude the current registration being edited
          },
          select: { registrationType: true },
        });

        if (registrationType === 'carry_over') {
          const coCount = currentRegs.filter((r) => r.registrationType === 'carry_over').length;
          if (coCount >= maxCarryOver) {
            return fail(400, { error: `Carry-over limit (${maxCarryOver}) already reached for this student` });
          }
        }

        if (registrationType === 'borrowed') {
          const bCount = currentRegs.filter((r) => r.registrationType === 'borrowed').length;
          if (bCount >= maxBorrowed) {
            return fail(400, { error: `Borrowed course limit (${maxBorrowed}) already reached for this student` });
          }
        }
      }
    }

    try {
      await prisma.courseRegistration.update({
        where: { id },
        data: {
          studentId,
          courseId,
          session,
          semester,
          registrationType: registrationType as any,
          levelId: levelId ?? undefined,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return fail(400, { error: 'Student is already registered for this course in this session and semester' });
      }
      console.error(err);
      return fail(500, { error: 'Failed to update course registration' });
    }
    return { success: true, message: 'Course registration updated successfully' };
  },

  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = data.get('id') as string;

            const prisma = await getPrismaClient();


    try {
      await prisma.courseRegistration.delete({ where: { id } });
    } catch {
      return fail(500, { error: 'Failed to delete course registration' });
    }
    return { success: true, message: 'Course registration deleted successfully' };
  },
};