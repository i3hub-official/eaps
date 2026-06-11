// src/routes/student/courses/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const currentSession  = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();
  
  // Get the active academic semester details
  let activeSemester = null;
  try {
    activeSemester = await prisma.academicSemester.findFirst({
      where: {
        session: currentSession,
        semester: currentSemester,
        isActive: true,
      },
      select: {
        id: true,
        session: true,
        semester: true,
        label: true,
        startDate: true,
        endDate: true,
        regOpen: true,
      },
    });
  } catch (err) {
    console.warn('Could not fetch AcademicSemester:', err);
  }

  // Get the student's level and semester configuration
  let levelConfig = null;
  if (user.levelId) {
    try {
      levelConfig = await prisma.levelSemesterConfig.findUnique({
        where: {
          levelId_semester: {
            levelId: user.levelId,
            semester: currentSemester,
          },
        },
        select: {
          maxCredits: true,
          maxCarryOver: true,
          maxBorrowed: true,
        },
      });
    } catch (err) {
      console.warn('Could not fetch LevelSemesterConfig:', err);
    }
  }

  // ── Registered courses for this session/semester ──────────────────────
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session:   currentSession,
      semester:  currentSemester,
    },
    include: {
      course: {
        include: {
          department: { select: { name: true, code: true } },
          exams: {
            where: { session: currentSession, semester: currentSemester },
            select: { id: true, title: true, status: true, scheduledStart: true },
          },
        },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate totals
  const totalCredits = registrations.reduce((s, r) => s + r.course.creditUnits, 0);
  const carryOverCount = registrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount = registrations.filter(r => r.registrationType === 'borrowed').length;
  
  // Check limits (using config if available, otherwise defaults)
  const maxCarryOver = levelConfig?.maxCarryOver ?? 6;
  const maxBorrowed = levelConfig?.maxBorrowed ?? 6;
  const maxCredits = levelConfig?.maxCredits ?? 24;
  
  const hasReachedCarryOverLimit = carryOverCount >= maxCarryOver;
  const hasReachedBorrowedLimit = borrowedCount >= maxBorrowed;
  const hasReachedCreditLimit = totalCredits >= maxCredits;
  
  const remainingCredits = Math.max(0, maxCredits - totalCredits);
  const canAddMore = remainingCredits > 0 && !hasReachedCreditLimit;

  return {
    registrations: registrations.map(r => ({
      id:               r.id,
      courseId:         r.courseId,
      courseCode:       r.course.code,
      courseTitle:      r.course.title,
      creditUnits:      r.course.creditUnits,
      department:       r.course.department?.name ?? '—',
      semester:         r.semester,
      registrationType: r.registrationType,
      status:           r.status,
      level:            r.level?.level ?? '—',
      exams: r.course.exams.map(e => ({
        id:             e.id,
        title:          e.title,
        status:         e.status,
        scheduledStart: e.scheduledStart,
      })),
      registeredAt: r.createdAt,
    })),
    meta: {
      session:      currentSession,
      semester:     currentSemester,
      semesterLabel: activeSemester?.label ?? `${currentSemester === 1 ? 'First' : 'Second'} Semester ${currentSession}`,
      totalCredits,
      maxCredits,
      remainingCredits,
      canAddMore,
      limits: {
        maxCarryOver,
        maxBorrowed,
        currentCarryOver: carryOverCount,
        currentBorrowed: borrowedCount,
        hasReachedCarryOverLimit,
        hasReachedBorrowedLimit,
      },
    },
    academicSemester: activeSemester ? {
      label: activeSemester.label,
      startDate: activeSemester.startDate,
      endDate: activeSemester.endDate,
      regOpen: activeSemester.regOpen,
    } : null,
  };
};

function deriveSessionFromDate(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}