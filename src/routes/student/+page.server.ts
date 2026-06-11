// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  // Get student's level information
  let studentLevel = null;
  let levelId = null;
  if (user.levelId) {
    const level = await prisma.level.findUnique({
      where: { id: user.levelId },
      select: { id: true, level: true, name: true },
    });
    if (level) {
      studentLevel = level;
      levelId = level.id;
    }
  }

  // Get level semester configuration
  let levelConfig = null;
  if (levelId) {
    try {
      levelConfig = await prisma.levelSemesterConfig.findUnique({
        where: {
          levelId_semester: {
            levelId: levelId,
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

  // Get active academic semester details
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
        label: true,
        startDate: true,
        endDate: true,
        regOpen: true,
      },
    });
  } catch (err) {
    console.warn('Could not fetch AcademicSemester:', err);
  }

  // Fetch registrations to calculate credits and counts
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        select: {
          creditUnits: true,
        },
      },
    },
  });

  // Calculate totals from fetched registrations
  const totalCredits = registrations.reduce((sum, reg) => sum + (reg.course?.creditUnits ?? 0), 0);
  const carryOverCount = registrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount = registrations.filter(r => r.registrationType === 'borrowed').length;

  const [
    recentExams,
    recentResults,
    registeredCourses,
    unreadNotifications,
  ] = await Promise.all([
    // Recent/upcoming exams
    prisma.exam.findMany({
      where: {
        status: { in: ['scheduled', 'active'] },
        session: currentSession,
        semester: currentSemester,
        course: {
          registrations: {
            some: { studentId: user.id, session: currentSession, semester: currentSemester },
          },
        },
      },
      take: 5,
      orderBy: { scheduledStart: 'asc' },
      include: {
        course: { select: { code: true, title: true } },
        examSessions: {
          where: { studentId: user.id },
          select: { id: true, status: true, score: true },
        },
      },
    }),
    // Recent results
    prisma.examResult.findMany({
      where: { studentId: user.id },
      take: 5,
      orderBy: { generatedAt: 'desc' },
      include: {
        exam: {
          select: {
            title: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
    }),
    // Course count
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
    // Unread notifications
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  // Calculate limits
  const maxCredits = levelConfig?.maxCredits ?? 24;
  const maxCarryOver = levelConfig?.maxCarryOver ?? 6;
  const maxBorrowed = levelConfig?.maxBorrowed ?? 6;
  const remainingCredits = Math.max(0, maxCredits - totalCredits);
  const creditPercentage = (totalCredits / maxCredits) * 100;

  return {
    recentExams: recentExams.map(e => ({
      id: e.id,
      title: e.title,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      status: e.status,
      scheduledStart: e.scheduledStart,
      scheduledEnd: e.scheduledEnd,
      durationMinutes: e.durationMinutes,
      sessionStatus: e.examSessions[0]?.status ?? null,
      sessionId: e.examSessions[0]?.id ?? null,
    })),
    recentResults: recentResults.map(r => ({
      id: r.id,
      examTitle: r.exam.title,
      courseCode: r.exam.course?.code,
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      submittedAt: r.submittedAt,
    })),
    student: {
      level: studentLevel,
      levelConfig: {
        maxCredits,
        maxCarryOver,
        maxBorrowed,
        currentCredits: totalCredits,
        currentCarryOver: carryOverCount,
        currentBorrowed: borrowedCount,
        remainingCredits,
        creditPercentage,
        hasReachedCreditLimit: totalCredits >= maxCredits,
        hasReachedCarryOverLimit: carryOverCount >= maxCarryOver,
        hasReachedBorrowedLimit: borrowedCount >= maxBorrowed,
      },
    },
    academicSemester: activeSemester,
    meta: {
      session: currentSession,
      semester: currentSemester,
      semesterLabel: activeSemester?.label ?? `${currentSemester === 1 ? 'First' : 'Second'} Semester ${currentSession}`,
      registeredCourses,
      unreadNotifications,
    },
  };
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