// src/routes/student/courses/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  // ── Single source of truth ────────────────────────────────────────────
  const { session: currentSession, semester: currentSemester } = await getActiveSemester();

  // ── Student profile (for print slip) ──────────────────────────────────
  const studentProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fullName:     true,
      matricNumber: true,
      level:        { select: { level: true, name: true } },
      college:      { select: { name: true } },
      department:   { select: { name: true } },
      programme:    { select: { name: true } },
    },
  });

  // ── Active academic semester ───────────────────────────────────────────
  let activeSemester = null;
  try {
    activeSemester = await prisma.academicSemester.findFirst({
      where: { session: currentSession, semester: currentSemester, isActive: true },
      select: {
        id: true, session: true, semester: true,
        label: true, startDate: true, endDate: true, regOpen: true,
      },
    });
  } catch (err) { console.warn('Could not fetch AcademicSemester:', err); }

  // ── Level credit config ───────────────────────────────────────────────
  let levelConfig = null;
  if (user.levelId) {
    try {
      levelConfig = await prisma.levelSemesterConfig.findUnique({
        where: { levelId_semester: { levelId: user.levelId, semester: currentSemester } },
        select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
      });
    } catch (err) { console.warn('Could not fetch LevelSemesterConfig:', err); }
  }

  // ── Registered courses ────────────────────────────────────────────────
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
            where: {
              session:  currentSession,
              semester: currentSemester,
              status:   { not: 'cancelled' },  // hide cancelled exams
            },
            select: { id: true, title: true, status: true, scheduledStart: true },
          },
        },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── Derived totals ────────────────────────────────────────────────────
  const totalCredits   = registrations.reduce((s, r) => s + r.course.creditUnits, 0);
  const carryOverCount = registrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount  = registrations.filter(r => r.registrationType === 'borrowed').length;

  const maxCarryOver = levelConfig?.maxCarryOver ?? 6;
  const maxBorrowed  = levelConfig?.maxBorrowed  ?? 6;
  const maxCredits   = levelConfig?.maxCredits   ?? 24;

  const remainingCredits         = Math.max(0, maxCredits - totalCredits);
  const hasReachedCarryOverLimit = carryOverCount >= maxCarryOver;
  const hasReachedBorrowedLimit  = borrowedCount  >= maxBorrowed;
  const hasReachedCreditLimit    = totalCredits   >= maxCredits;
  const canAddMore               = remainingCredits > 0 && !hasReachedCreditLimit;

  return {
    // ── Print slip ──────────────────────────────────────────────────────
    student: {
      name:       studentProfile?.fullName         ?? user.fullName ?? '—',
      regNumber:  studentProfile?.matricNumber     ?? '—',
      faculty:    studentProfile?.college?.name    ?? '—',
      department: studentProfile?.department?.name ?? '—',
      programme:  studentProfile?.programme?.name  ?? '—',
      level:      studentProfile?.level?.name
                    ?? (studentProfile?.level?.level
                        ? `${studentProfile.level.level} Level`
                        : '—'),
    },

    // ── Registrations ───────────────────────────────────────────────────
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

    // ── Meta ────────────────────────────────────────────────────────────
    meta: {
      session:       currentSession,
      semester:      currentSemester,
      semesterLabel: activeSemester?.label
                       ?? `${currentSemester === 1 ? 'First' : 'Second'} Semester ${currentSession}`,
      totalCredits,
      maxCredits,
      remainingCredits,
      canAddMore,
      limits: {
        maxCarryOver,
        maxBorrowed,
        currentCarryOver:         carryOverCount,
        currentBorrowed:          borrowedCount,
        hasReachedCarryOverLimit,
        hasReachedBorrowedLimit,
      },
    },

    academicSemester: activeSemester
      ? {
          label:     activeSemester.label,
          startDate: activeSemester.startDate,
          endDate:   activeSemester.endDate,
          regOpen:   activeSemester.regOpen,
        }
      : null,
  };
};
