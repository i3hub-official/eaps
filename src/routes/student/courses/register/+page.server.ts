// src/routes/(student)/student/courses/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';
import { getActiveSemester } from '$lib/server/academic/semester.js';

// ─────────────────────────────────────────────────────────────────────────────
// Registration state machine
//
//   draft → submitted → locked
//
// State stored in UserPreference.prefs JSON:
//   { regState: { "2025/2026_1": "draft" | "submitted" | "locked" } }
// ─────────────────────────────────────────────────────────────────────────────

type RegPhase = 'draft' | 'submitted' | 'locked';

async function getRegPhase(userId: string, key: string): Promise<RegPhase> {
    const prisma = await getPrismaClient();
  
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { prefs: true },
  });
  const prefs = (pref?.prefs ?? {}) as Record<string, unknown>;
  const regState = (prefs.regState ?? {}) as Record<string, string>;
  return (regState[key] as RegPhase) ?? 'draft';
}

async function setRegPhase(userId: string, key: string, phase: RegPhase) {
  const prisma = await getPrismaClient();

  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { prefs: true },
  });
  const prefs = (pref?.prefs ?? {}) as Record<string, unknown>;
  const regState = { ...((prefs.regState ?? {}) as Record<string, string>), [key]: phase };
  const newPrefs = { ...prefs, regState };
  await prisma.userPreference.upsert({
    where: { userId },
    update: { prefs: newPrefs },
    create: { userId, prefs: newPrefs },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
  const user = await requireStudent(locals.user);
  const prisma = await getPrismaClient();


  const { session: currentSession, semester: currentSemester, regOpen } = await getActiveSemester();
  const studentCollegeId = user.collegeId ?? null;
  const regKey = `${currentSession}_${currentSemester}`;

  const [levelRow, collegeRow, phase] = await Promise.all([
    user.levelId
      ? prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
      : null,
    studentCollegeId
      ? prisma.college.findUnique({ where: { id: studentCollegeId }, select: { name: true } })
      : null,
    getRegPhase(user.id, regKey),
  ]);
  const studentLevel = levelRow?.level ?? 100;

  const configRow = await prisma.levelSemesterConfig.findUnique({
    where: { levelId_semester: { levelId: user.levelId ?? 0, semester: currentSemester } },
    select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
  });
  const MAX_CREDITS = configRow?.maxCredits ?? 25;
  const MAX_CARRY_OVER = configRow?.maxCarryOver ?? 6;
  const MAX_BORROWED = configRow?.maxBorrowed ?? 6;

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

  const registeredIds = new Set(existingRegs.map(r => r.courseId));
  const currentCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

  const deptInclude = {
    select: {
      id: true, name: true, code: true, collegeId: true,
      college: { select: { id: true, name: true, abbreviation: true } },
    },
  } as const;

  const notRegistered = { NOT: { id: { in: Array.from(registeredIds) } } } as const;

const [collegeCourses, carryOverCourses, borrowedCourses] = await Promise.all([
  studentCollegeId
    ? prisma.course.findMany({
      where: { 
        ...notRegistered, 
        level: studentLevel,
        semester: currentSemester,  // ✅ ADD THIS
        department: { collegeId: studentCollegeId } 
      },
      include: { department: deptInclude, _count: { select: { registrations: true } } },
      orderBy: { code: 'asc' },
    })
    : Promise.resolve([]),
  (studentCollegeId && studentLevel > 100)
    ? prisma.course.findMany({
      where: { 
        ...notRegistered, 
        level: { lt: studentLevel },
        semester: currentSemester,  // ✅ ADD THIS
        department: { collegeId: studentCollegeId } 
      },
      include: { department: deptInclude, _count: { select: { registrations: true } } },
      orderBy: [{ level: 'desc' }, { code: 'asc' }],
    })
    : Promise.resolve([]),
  studentCollegeId
    ? prisma.course.findMany({
      where: {
        ...notRegistered,
        level: studentLevel,
        semester: currentSemester,  // ✅ ADD THIS
        department: {
          collegeId: { not: studentCollegeId },
        },
      },
      include: { department: deptInclude, _count: { select: { registrations: true } } },
      orderBy: [{ department: { collegeId: 'asc' } }, { code: 'asc' }],
    })
    : Promise.resolve([]),
]);

  const preselected = url.searchParams.get('course') ?? null;

  type CourseRow = (typeof collegeCourses)[number];
  const serialize = (c: CourseRow) => ({
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
    collegeCourses: collegeCourses.map(serialize),
    carryOverCourses: carryOverCourses.map(serialize),
    borrowedCourses: borrowedCourses.map(serialize),
    meta: {
      session: currentSession, semester: currentSemester,
      maxCredits: MAX_CREDITS, maxCarryOver: MAX_CARRY_OVER, maxBorrowed: MAX_BORROWED,
      currentCredits,
      studentLevel, studentCollege: collegeRow?.name ?? null,
      phase, regOpen,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared context resolver
// ─────────────────────────────────────────────────────────────────────────────
async function resolveStudentContext(user: ReturnType<typeof requireStudent>) {
  const prisma = await getPrismaClient();

  const { session: currentSession, semester: currentSemester, regOpen } = await getActiveSemester();
  const studentCollegeId = user.collegeId ?? null;
  const regKey = `${currentSession}_${currentSemester}`;
  const [levelRow, phase] = await Promise.all([
    user.levelId
      ? prisma.level.findUnique({ where: { id: user.levelId }, select: { level: true } })
      : null,
    getRegPhase(user.id, regKey),
  ]);
  const studentLevel = levelRow?.level ?? 100;

  const configRow = await prisma.levelSemesterConfig.findUnique({
    where: { levelId_semester: { levelId: user.levelId ?? 0, semester: currentSemester } },
    select: { maxCredits: true, maxCarryOver: true, maxBorrowed: true },
  });

  return {
    currentSession, currentSemester, studentCollegeId, regKey,
    studentLevel,
    phase, regOpen,
    maxCredits: configRow?.maxCredits ?? 25,
    maxCarryOver: configRow?.maxCarryOver ?? 6,
    maxBorrowed: configRow?.maxBorrowed ?? 6,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-course validation helper
// ─────────────────────────────────────────────────────────────────────────────
async function validateCourseForStudent(
  courseId: string,
  type: 'normal' | 'carry_over' | 'borrowed',
  ctx: Awaited<ReturnType<typeof resolveStudentContext>>,
) {
  const prisma = await getPrismaClient();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { department: { select: { collegeId: true } } },
  });
  if (!course) return { error: `Course ${courseId} not found.` };

  const sameCollege = course.department.collegeId === ctx.studentCollegeId;
  const courseLevel = course.level ?? 0;

  if (type === 'normal') {
    if (!sameCollege) return { error: 'Normal registration is only for courses in your own college.' };
    if (courseLevel !== ctx.studentLevel) return { error: 'Normal registration is only for courses at your current level.' };
  }
  if (type === 'carry_over') {
    if (!sameCollege) return { error: 'Carry-over is only for courses in your own college.' };
    if (ctx.studentLevel <= 100) return { error: '100 Level students cannot register carry-over courses.' };
    if (courseLevel >= ctx.studentLevel) return { error: 'Carry-over courses must be from a level below yours.' };
  }
  if (type === 'borrowed') {
    // Can't borrow if own college is unknown — sameCollege would be null === null = true and slip through
    if (!ctx.studentCollegeId) return { error: 'Your college is not set. Contact your academic office.' };
    if (sameCollege) return { error: 'Borrowed registration is only for courses from other colleges.' };
    if (courseLevel !== ctx.studentLevel) return { error: 'Borrowed courses must be at your current level.' };
  }

  return { course };
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export const actions: Actions = {

  // ── Batch add (draft phase) ───────────────────────────────────────────
  // Replaces the old single `register` action.
  // Receives repeated fields: courseId[], type[]  (parallel arrays)
  batchRegister: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
    const prisma = await getPrismaClient();
    const fd = await request.formData();
    const ctx = await resolveStudentContext(user);


    if (!ctx.regOpen) {
      return fail(403, { error: 'Course registration is currently closed. Contact your academic office.' });
    }
    if (ctx.phase === 'locked') {
      return fail(403, { error: 'Your registration is fully locked. Contact your academic office.' });
    }
    if (ctx.phase !== 'draft') {
      return fail(400, { error: 'Use the update action once your registration is submitted.' });
    }

    const courseIds = fd.getAll('courseId').map(v => v.toString());
    const types = fd.getAll('type').map(v => v.toString() as 'normal' | 'carry_over' | 'borrowed');

    if (courseIds.length === 0) return fail(400, { error: 'No courses selected.' });

    // Load existing to check duplicates and credits
    const existingRegs = await prisma.courseRegistration.findMany({
      where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester },
      select: { courseId: true, registrationType: true, course: { select: { creditUnits: true } } },
    });
    const registeredSet = new Set(existingRegs.map(r => r.courseId));
    let usedCredits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

    // Validate each course
    const toCreate: { courseId: string; type: 'normal' | 'carry_over' | 'borrowed'; status: string }[] = [];

    for (let i = 0; i < courseIds.length; i++) {
      const courseId = courseIds[i];
      const type = types[i] ?? 'normal';

      if (registeredSet.has(courseId)) continue; // skip already-registered silently

      const result = await validateCourseForStudent(courseId, type, ctx);
      if (result.error) return fail(400, { error: result.error });

      usedCredits += result.course!.creditUnits;
      if (usedCredits > ctx.maxCredits) {
        return fail(400, { error: `Credit limit exceeded. Max is ${ctx.maxCredits} CU.` });
      }

      const status = type === 'carry_over' ? 'pending' : 'approved';
      toCreate.push({ courseId, type, status });
    }

    if (toCreate.length === 0) {
      return fail(400, { error: 'All selected courses are already registered.' });
    }

    // Enforce carry-over and borrowed caps
    // Count existing + what we're about to add
    const existingCarryOver = existingRegs.filter((r: any) => r.registrationType === 'carry_over').length;
    const existingBorrowed = existingRegs.filter((r: any) => r.registrationType === 'borrowed').length;
    const addingCarryOver = toCreate.filter(c => c.type === 'carry_over').length;
    const addingBorrowed = toCreate.filter(c => c.type === 'borrowed').length;

    if (existingCarryOver + addingCarryOver > ctx.maxCarryOver) {
      return fail(400, { error: `Carry-over limit is ${ctx.maxCarryOver} courses. You already have ${existingCarryOver}.` });
    }
    if (existingBorrowed + addingBorrowed > ctx.maxBorrowed) {
      return fail(400, { error: `Borrowed limit is ${ctx.maxBorrowed} courses. You already have ${existingBorrowed}.` });
    }

    await prisma.$transaction(
      toCreate.map(({ courseId, type, status }) =>
        prisma.courseRegistration.create({
          data: {
            studentId: user.id, courseId,
            session: ctx.currentSession, semester: ctx.currentSemester,
            registrationType: type, status,
            levelId: user.levelId ?? undefined,
          },
        })
      )
    );

    return { success: true, added: toCreate.length };
  },

  // ── Drop one course (draft phase) ─────────────────────────────────────
  drop: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
              const prisma = await getPrismaClient();
    const fd = await request.formData();
    const registrationId = fd.get('registrationId')?.toString();
    if (!registrationId) return fail(400, { error: 'Registration ID required.' });

    const ctx = await resolveStudentContext(user);
    if (ctx.phase === 'locked') {
      return fail(403, { error: 'Registration is locked. Contact your academic office.' });
    }

    const reg = await prisma.courseRegistration.findFirst({
      where: { id: registrationId, studentId: user.id },
    });
    if (!reg) return fail(404, { error: 'Registration not found.' });

    await prisma.courseRegistration.delete({ where: { id: registrationId } });
    return { success: true };
  },

  // ── Submit registration (draft → submitted) ───────────────────────────
  submit: async ({ locals }) => {
    const user = await requireStudent(locals.user);
              const prisma = await getPrismaClient();
    
    const ctx = await resolveStudentContext(user);

    if (ctx.phase !== 'draft') return fail(400, { error: 'Already submitted.' });

    const count = await prisma.courseRegistration.count({
      where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester },
    });
    if (count === 0) {
      return fail(400, { error: 'Register at least one course before submitting.' });
    }

    await setRegPhase(user.id, ctx.regKey, 'submitted');
    return { success: true, phase: 'submitted' };
  },

  // ── One-time update (submitted → locked) ──────────────────────────────
  // addCourseId[] + addType[] (parallel) and dropId[] (registration IDs)
  update: async ({ request, locals }) => {
    const user = await requireStudent(locals.user);
              const prisma = await getPrismaClient();
    
    const fd = await request.formData();
    const ctx = await resolveStudentContext(user);

    if (ctx.phase === 'draft') {
      return fail(400, { error: 'Submit your registration before using the update window.' });
    }
    if (ctx.phase === 'locked') {
      return fail(403, { error: 'You have already used your one-time update. Contact your academic office.' });
    }

    const addCourseIds = fd.getAll('addCourseId').map(v => v.toString());
    const addTypes = fd.getAll('addType').map(v => v.toString() as 'normal' | 'carry_over' | 'borrowed');
    const dropIds = fd.getAll('dropId').map(v => v.toString());

    if (addCourseIds.length === 0 && dropIds.length === 0) {
      return fail(400, { error: 'No changes selected.' });
    }

    // Load current state
    const existingRegs = await prisma.courseRegistration.findMany({
      where: { studentId: user.id, session: ctx.currentSession, semester: ctx.currentSemester },
      select: { id: true, courseId: true, registrationType: true, course: { select: { creditUnits: true } } },
    });
    let credits = existingRegs.reduce((s, r) => s + r.course.creditUnits, 0);

    // Validate drops
    for (const dropId of dropIds) {
      const reg = existingRegs.find(r => r.id === dropId);
      if (!reg) return fail(404, { error: `Registration ${dropId} not found.` });
      credits -= reg.course.creditUnits;
    }

    // Validate adds
    const toAdd: { courseId: string; creditUnits: number; type: 'normal' | 'carry_over' | 'borrowed'; status: string }[] = [];
    for (let i = 0; i < addCourseIds.length; i++) {
      const courseId = addCourseIds[i];
      const type = addTypes[i] ?? 'normal';

      const result = await validateCourseForStudent(courseId, type, ctx);
      if (result.error) return fail(400, { error: result.error });

      credits += result.course!.creditUnits;
      if (credits > ctx.maxCredits) {
        return fail(400, { error: `Credit limit exceeded after changes. Max is ${ctx.maxCredits} CU.` });
      }

      const status = type === 'carry_over' ? 'pending' : 'approved';
      toAdd.push({ courseId, creditUnits: result.course!.creditUnits, type, status });
    }

    // Enforce carry-over and borrowed caps after accounting for drops
    const remainingRegs = existingRegs.filter((r: any) => !dropIds.includes(r.id));
    const keptCarryOver = remainingRegs.filter((r: any) => r.registrationType === 'carry_over').length;
    const keptBorrowed = remainingRegs.filter((r: any) => r.registrationType === 'borrowed').length;
    const addingCarryOver = toAdd.filter(c => c.type === 'carry_over').length;
    const addingBorrowed = toAdd.filter(c => c.type === 'borrowed').length;

    if (keptCarryOver + addingCarryOver > ctx.maxCarryOver) {
      return fail(400, { error: `Carry-over limit is ${ctx.maxCarryOver} courses.` });
    }
    if (keptBorrowed + addingBorrowed > ctx.maxBorrowed) {
      return fail(400, { error: `Borrowed limit is ${ctx.maxBorrowed} courses.` });
    }

    // Apply atomically
    await prisma.$transaction([
      ...dropIds.map(id => prisma.courseRegistration.delete({ where: { id } })),
      ...toAdd.map(({ courseId, type, status }) =>
        prisma.courseRegistration.create({
          data: {
            studentId: user.id, courseId,
            session: ctx.currentSession, semester: ctx.currentSemester,
            registrationType: type, status,
            levelId: user.levelId ?? undefined,
          },
        })
      ),
    ]);

    // Consume the one-time update → lock
    await setRegPhase(user.id, ctx.regKey, 'locked');
    return { success: true, phase: 'locked' };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// semester/session now comes from getActiveSemester() in $lib/server/academic/semester.ts