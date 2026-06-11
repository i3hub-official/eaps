// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  // ── Single source of truth for session/semester ───────────────────────
  const { session: currentSession, semester: currentSemester } = await getActiveSemester();

  // ── Check if student has enrolled face ────────────────────────────────
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
    select: { studentId: true },
  });
  const hasFaceEnrolled = !!faceDescriptor;

  // ── Student level ─────────────────────────────────────────────────────
  let studentLevel = null;
  let levelId: number | null = null;
  if (user.levelId) {
    const level = await prisma.level.findUnique({
      where: { id: user.levelId },
      select: { id: true, level: true, name: true },
    });
    if (level) { studentLevel = level; levelId = level.id; }
  }

  // ── Level credit config ───────────────────────────────────────────────
  let levelConfig = null;
  if (levelId) {
    try {
      levelConfig = await prisma.levelSemesterConfig.findUnique({
        where: { levelId_semester: { levelId, semester: currentSemester } },
        select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
      });
    } catch (err) { console.warn('Could not fetch LevelSemesterConfig:', err); }
  }

  // ── Active academic semester ───────────────────────────────────────────
  let activeSemester = null;
  try {
    activeSemester = await prisma.academicSemester.findFirst({
      where: { session: currentSession, semester: currentSemester, isActive: true },
      select: { id: true, label: true, startDate: true, endDate: true, regOpen: true },
    });
  } catch (err) { console.warn('Could not fetch AcademicSemester:', err); }

  // ── Registrations for this session/semester ───────────────────────────
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session:   currentSession,
      semester:  currentSemester,
    },
    select: {
      registrationType: true,
      course: { select: { creditUnits: true } },
    },
  });

  const registeredCourses = registrations.length;
  const totalCredits      = registrations.reduce((s, r) => s + (r.course?.creditUnits ?? 0), 0);
  const carryOverCount    = registrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount     = registrations.filter(r => r.registrationType === 'borrowed').length;

  const maxCredits   = levelConfig?.maxCredits   ?? 24;
  const maxCarryOver = levelConfig?.maxCarryOver ?? 6;
  const maxBorrowed  = levelConfig?.maxBorrowed  ?? 6;

  // ── Parallel queries ──────────────────────────────────────────────────
  const [recentExams, recentResults, unreadNotifications] = await Promise.all([
    // Upcoming / active exams for registered courses only
    prisma.exam.findMany({
      where: {
        status: { in: ['scheduled', 'active'] },
        session:  currentSession,
        semester: currentSemester,
        course: {
          registrations: {
            some: {
              studentId: user.id,
              session:   currentSession,
              semester:  currentSemester,
            },
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

    // Recent results (all-time)
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

    // Unread notifications
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  const remainingCredits  = Math.max(0, maxCredits - totalCredits);
  const creditPercentage  = maxCredits > 0 ? (totalCredits / maxCredits) * 100 : 0;

  return {
    recentExams: recentExams.map(e => ({
      id:              e.id,
      title:           e.title,
      courseCode:      e.course.code,
      courseTitle:     e.course.title,
      status:          e.status,
      scheduledStart:  e.scheduledStart,
      scheduledEnd:    e.scheduledEnd,
      durationMinutes: e.durationMinutes,
      sessionStatus:   e.examSessions[0]?.status ?? null,
      sessionId:       e.examSessions[0]?.id     ?? null,
    })),

    recentResults: recentResults.map(r => ({
      id:          r.id,
      examTitle:   r.exam.title,
      courseCode:  r.exam.course?.code,
      score:       r.score,
      percentage:  r.percentage,
      passed:      r.passed,
      grade:       r.grade,
      submittedAt: r.submittedAt,
    })),

    student: {
      level: studentLevel,
      hasFaceEnrolled,  // ← Add this
      levelConfig: {
        maxCredits,
        maxCarryOver,
        maxBorrowed,
        currentCredits:           totalCredits,
        currentCarryOver:         carryOverCount,
        currentBorrowed:          borrowedCount,
        remainingCredits,
        creditPercentage,
        hasReachedCreditLimit:    totalCredits    >= maxCredits,
        hasReachedCarryOverLimit: carryOverCount  >= maxCarryOver,
        hasReachedBorrowedLimit:  borrowedCount   >= maxBorrowed,
      },
    },

    academicSemester: activeSemester,

    meta: {
      session:           currentSession,
      semester:          currentSemester,
      semesterLabel:     activeSemester?.label
                           ?? `${currentSemester === 1 ? 'First' : 'Second'} Semester ${currentSession}`,
      registeredCourses,
      unreadNotifications,
    },
  };
};