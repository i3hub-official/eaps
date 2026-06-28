// src/routes/student/courses/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getActiveSemester } from '$lib/server/academic/semester.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  // ── Single source of truth ────────────────────────────────────────────
  const { session: currentSession, semester: currentSemester } = await getActiveSemester();

  // ── Student profile (for print slip) ──────────────────────────────────
  const studentProfile: {
    fullName: string | null;
    matricNumber: string | null;
    level: { level: number | null; name: string | null } | null;
    college: { name: string | null } | null;
    department: { name: string | null } | null;
    programme: { name: string | null } | null;
  } | null = await prisma.user.findUnique({
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
  // `user` may not always have a `levelId` property on the typed object returned
  // from guards. Safely read it and use only when present.
  const userLevelId = (user as any).levelId as string | undefined;
  if (userLevelId) {
    try {
      levelConfig = await prisma.levelSemesterConfig.findUnique({
        where: { levelId_semester: { levelId: userLevelId, semester: currentSemester } },
        select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
      });
    } catch (err) { console.warn('Could not fetch LevelSemesterConfig:', err); }
  }

  // ── Get submitted exam IDs for this student ───────────────────────────
  const submittedExamIds = await prisma.examSession.findMany({
    where: {
      studentId: user.id,
      status: { in: ['submitted', 'force_submitted'] },
    },
    select: { examId: true },
  });
  const submittedSet = new Set(submittedExamIds.map(s => s.examId));

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
      name:       studentProfile?.fullName         ?? '—',
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
    exams: r.course.exams.map(e => {
  // If the exam is submitted, mark it as completed
  const status = submittedSet.has(e.id) ? 'completed' : e.status;
  return {
    id: e.id,
    title: e.title,
    status: status,
    scheduledStart: e.scheduledStart,
  };
})
// Filter out cancelled exams only
.filter(e => e.status !== 'cancelled')
// Sort: active → scheduled → completed
.sort((a, b) => {
  const order = { active: 0, scheduled: 1, completed: 2 };
  return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
})
        .map(e => ({
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