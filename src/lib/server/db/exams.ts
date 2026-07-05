// src/lib/server/db/exams.ts
import { getPrismaClient } from './index.js';
import type { Exam, ExamStatus } from '@prisma/client';

export type { Exam, ExamStatus };

const withCourse = {
  course: { select: { code: true, title: true, departmentId: true } },
} as const;

export async function getExamById(id: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findUnique({ where: { id } });
}

export async function getExamForSession(id: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findUnique({
    where: { id },
    include: {
      ...withCourse,
      levels: { select: { level: true } },
    },
  });
}

// ─── Active semester ──────────────────────────────────────────────────────────

export async function getActiveAcademicSemester() {
  const prisma = await getPrismaClient();
  return prisma.academicSemester.findFirst({ where: { isActive: true } });
}

export async function findCurrentExamForStudent(student: {
  id: string;
  level: { level: number } | null;
  department: { name: string } | null;
}): Promise<string | null> {
  const prisma = await getPrismaClient();

  // In-progress session wins immediately
  const inProgress = await prisma.examSession.findFirst({
    where: { studentId: student.id, status: 'in_progress' },
    orderBy: { startedAt: 'desc' },
    select: { examId: true },
  });
  if (inProgress) return inProgress.examId;

  const active = await prisma.academicSemester.findFirst({
    where: { isActive: true },
  });
  if (!active) return null;

  // Offering-aware first, legacy courseId fallback for exams created before
  // the academic-offering layer existed (Exam.offeringId nullable during migration).
  const candidates = await prisma.exam.findMany({
    where: {
      status: 'active',
      session: active.session,
      semester: active.semester,
      OR: [
        {
          offeringId: { not: null },
          offering: {
            registrations: {
              some: {
                studentId: student.id,
                status: { notIn: ['rejected', 'withdrawn'] },
              },
            },
          },
        },
        {
          offeringId: null,
          course: {
            registrations: {
              some: {
                studentId: student.id,
                session: active.session,
                semester: active.semester,
                status: { notIn: ['rejected', 'withdrawn'] },
              },
            },
          },
        },
      ],
    },
    include: {
      course: { include: { department: true } },
      examLevels: {
        select: { level: { select: { level: true, name: true } } },
      },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  if (candidates.length > 0) return candidates[0].id;

  console.log('[exam-debug]', {
    studentId: student.id,
    studentLevel: student.level?.level,
    activeSemester: active,
    candidateCount: candidates.length,
  });

  return null;
}

export async function getExamWithCourse(id: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findUnique({ where: { id }, include: withCourse });
}

export async function listExamsByLecturer(lecturerId: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findMany({
    where: { createdBy: lecturerId },
    include: withCourse,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listExamsForStudent(studentId: string) {
  const prisma = await getPrismaClient();

  const active = await getActiveAcademicSemester();
  if (!active) return [];

  return prisma.exam.findMany({
    where: {
      status: { in: ['scheduled', 'active'] },
      session: active.session,
      semester: active.semester,
      OR: [
        {
          offeringId: { not: null },
          offering: {
            registrations: {
              some: {
                studentId,
                status: { notIn: ['rejected', 'withdrawn'] },
              },
            },
          },
        },
        {
          offeringId: null,
          course: {
            registrations: {
              some: {
                studentId,
                session: active.session,
                semester: active.semester,
                status: { notIn: ['rejected', 'withdrawn'] },
              },
            },
          },
        },
      ],
    },
    include: withCourse,
    orderBy: { scheduledStart: 'asc' },
  });
}

export async function listExamsForInvigilator(invigilatorId: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findMany({
    where: {
      status: { in: ['scheduled', 'active'] },
      invigilators: { some: { invigilatorId } },
    },
    include: withCourse,
    orderBy: { scheduledStart: 'asc' },
  });
}

// ─── Eligible-student counting ────────────────────────────────────────────────

export async function countEligibleStudents(exam: {
  courseId: string;
  offeringId?: string | null;
  session: string;
  semester: number;
  levels: { level: number }[];
  department: string | null;
}): Promise<number> {
  const prisma = await getPrismaClient();

  const registrations = exam.offeringId
    ? await prisma.courseRegistration.findMany({
        where: {
          offeringId: exam.offeringId,
          status: { notIn: ['rejected', 'withdrawn'] },
        },
        select: {
          status: true,
          registrationType: true,
          levelId: true,
          student: {
            select: {
              level: { select: { level: true } },
              department: { select: { name: true } },
            },
          },
        },
      })
    : await prisma.courseRegistration.findMany({
        where: {
          courseId: exam.courseId,
          session: exam.session,
          semester: exam.semester,
          status: { notIn: ['rejected', 'withdrawn'] },
        },
        select: {
          status: true,
          registrationType: true,
          levelId: true,
          student: {
            select: {
              level: { select: { level: true } },
              department: { select: { name: true } },
            },
          },
        },
      });

  let count = 0;
  for (const r of registrations) {
    const reg = { status: r.status, registrationType: r.registrationType, levelId: r.levelId };
    if (isStudentEligible(exam, r.student, reg).eligible) count++;
  }
  return count;
}

// ─── Lecturer-facing queries ──────────────────────────────────────────────────

export async function getCoursesForLecturer(lecturer: { departmentId: string | null }) {
  const prisma = await getPrismaClient();
  return prisma.course.findMany({
    where: lecturer.departmentId ? { departmentId: lecturer.departmentId } : undefined,
    orderBy: { code: 'asc' },
    select: { id: true, code: true, title: true, level: true, semester: true, creditUnits: true },
  });
}

export async function getExamsByLecturerWithStats(lecturerId: string) {
  const prisma = await getPrismaClient();

  const exams = await prisma.exam.findMany({
    where: { createdBy: lecturerId },
    include: {
      ...withCourse,
      levels: { select: { level: true } },
      _count: { select: { questions: true, examSessions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    exams.map(async (exam) => ({
      ...exam,
      questionCount: exam._count.questions,
      sessionCount:  exam._count.examSessions,
      eligibleCount: await countEligibleStudents(exam),
    }))
  );
}

export async function getExamForLecturer(examId: string, lecturerId: string) {
  const prisma = await getPrismaClient();
  return prisma.exam.findFirst({
    where: { id: examId, createdBy: lecturerId },
    include: {
      ...withCourse,
      levels: { select: { level: true } },
      invigilators: {
        include: {
          invigilator: { select: { id: true, fullName: true, email: true, staffId: true } },
        },
      },
      _count: { select: { questions: true, examSessions: true } },
    },
  });
}

/**
 * Courses an HOD can create exams for — everything taught within their own department.
 */
export async function getCoursesForHod({ departmentId }: { departmentId: string }) {
  const prisma = await getPrismaClient();

  return prisma.course.findMany({
    where: { departmentId, isActive: true, isDiscontinued: false },
    select: { id: true, code: true, title: true },
    orderBy: { code: 'asc' },
  });
}

/**
 * Courses an Exam Officer can create exams for — everything taught across
 * every department in their college, including GST/shared offerings that
 * span multiple departments within that college.
 */
export async function getCoursesForExamOfficer({ collegeId }: { collegeId: number }) {
  const prisma = await getPrismaClient();

  return prisma.course.findMany({
    where: {
      isActive: true,
      isDiscontinued: false,
      OR: [
        { department: { collegeId } },
        { offerings: { some: { departments: { some: { department: { collegeId } } } } } },
      ],
    },
    select: { id: true, code: true, title: true },
    orderBy: { code: 'asc' },
    distinct: ['id'],
  });
}

export async function createExam(input: {
  courseId: string;
  offeringId?: string | null;
  createdBy: string;
  title: string;
  instructions?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passMark?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  allowLateEntry?: boolean;
  lateEntryMinutes?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  showResultAfter?: boolean;
  maxViolations?: number;
  questionsToPresent?: number;
  session: string;
  semester: number;
  levels?: number[];
  department?: string | null;
  marksPerQuestion?: number;
}) {
  const prisma = await getPrismaClient();
  const { levels, department, questionsToPresent, marksPerQuestion, ...rest } = input;
  const levelConnect =
    levels && levels.length > 0
      ? { connect: levels.map((l) => ({ level: l })) }
      : undefined;

  return prisma.exam.create({
    data: {
      ...rest,
      department: department ?? null,
      questionsToPresent: questionsToPresent ?? 0,
      marksPerQuestion: marksPerQuestion ?? 0,
      ...(levelConnect ? { levels: levelConnect } : {}),
    },
  });
}

export async function updateExam(
  id: string,
  input: Partial<{
    title: string;
    instructions: string;
    durationMinutes: number;
    totalMarks: number;
    passMark: number;
    status: ExamStatus;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    allowLateEntry: boolean;
    lateEntryMinutes: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    showResultAfter: boolean;
    maxViolations: number;
    questionsToPresent: number;
    levels: number[];
    department: string | null;
    marksPerQuestion: number;
    offeringId: string | null;
  }>,
) {
  const prisma = await getPrismaClient();
  const { levels, marksPerQuestion, ...rest } = input;
  const levelConnect =
    levels !== undefined ? { set: levels.map((l) => ({ level: l })) } : undefined;

  return prisma.exam.update({
    where: { id },
    data: {
      ...rest,
      ...(levelConnect ? { levels: levelConnect } : {}),
      marksPerQuestion: marksPerQuestion ?? 0,
    },
  });
}

export async function setExamStatus(id: string, status: ExamStatus) {
  const prisma = await getPrismaClient();
  await prisma.exam.update({ where: { id }, data: { status } });
}

export async function assignInvigilator(examId: string, invigilatorId: string) {
  const prisma = await getPrismaClient();
  await prisma.examInvigilator.upsert({
    where: { examId_invigilatorId: { examId, invigilatorId } },
    create: { examId, invigilatorId },
    update: {},
  });
}

export async function removeInvigilator(examId: string, invigilatorId: string) {
  const prisma = await getPrismaClient();
  await prisma.examInvigilator.delete({
    where: { examId_invigilatorId: { examId, invigilatorId } },
  });
}

export async function getExamInvigilators(examId: string) {
  const prisma = await getPrismaClient();
  return prisma.examInvigilator.findMany({
    where: { examId },
    include: {
      invigilator: {
        select: { id: true, fullName: true, email: true, staffId: true },
      },
    },
  });
}

// ─── Core eligibility ─────────────────────────────────────────────────────────

/**
 * Registration shape needed by isStudentEligible.
 * Pass null when no registration exists for this student+course.
 */
export type RegForEligibility = {
  status: string;           // 'pending' | 'approved' | 'rejected' | 'withdrawn'
  registrationType: string; // 'normal' | 'carry_over' | 'borrowed'
  levelId: number | null;
} | null;

/**
 * isStudentEligible
 *
 * Level rules:
 *   student level === exam level  → normal sitting ✅
 *   student level  >  exam level  → carry-over:
 *       registrationType must be 'carry_over' ✅
 *       100L students can NEVER have carry-over ❌
 *   student level  <  exam level  → above student's level ❌
 *   exam has no level restriction → open to all registered students ✅
 *
 * Department rules:
 *   exam.department is a comma-separated whitelist of dept names.
 *   Empty / null means no restriction.
 *
 * IMPORTANT: `reg` must be the caller's actual lookup result, not omitted.
 * Previously some call sites invoked this with only (exam, student), which
 * silently defaulted reg to null and made every call fail the very first
 * check regardless of a separate registration lookup done upstream. Always
 * pass the fetched registration explicitly.
 */
export function isStudentEligible(
  exam: { levels: { level: number }[]; department: string | null },
  student: { level: { level: number } | null; department: { name: string } | null },
  reg: RegForEligibility = null,
): { eligible: boolean; reason?: string } {

  // ── Registration ──────────────────────────────────────────────────────────
  if (!reg) {
    return { eligible: false, reason: 'You are not registered for this course.' };
  }
  if (reg.status === 'rejected' || reg.status === 'withdrawn') {
    return { eligible: false, reason: `Your course registration has been ${reg.status}.` };
  }

  // ── Level check ───────────────────────────────────────────────────────────
  if (exam.levels.length > 0) {
    const examLevels  = exam.levels.map((l) => l.level);
    const studentLevel = student.level?.level ?? null;

    if (studentLevel === null) {
      return { eligible: false, reason: 'Your academic level has not been set. Contact the registry.' };
    }

    if (examLevels.includes(studentLevel)) {
      // Normal sitting — student is at the same level as the exam.
      // Fall through to department check.
    } else if (studentLevel > Math.min(...examLevels)) {
      // Student is ABOVE the exam level → carry-over territory.

      // 100L has no prior semester, so carry-over is impossible.
      if (studentLevel === 100) {
        return { eligible: false, reason: '100-level students cannot have carry-over courses.' };
      }

      if (reg.registrationType !== 'carry_over') {
        const label = examLevels.map((l) => `${l}L`).join(', ');
        return {
          eligible: false,
          reason: `This exam targets ${label} students. Register it as a carry-over to be eligible.`,
        };
      }

      // registrationType === 'carry_over' → allowed, fall through to dept check.
    } else {
      // studentLevel < exam level — can never sit an exam above your level.
      const label = examLevels.map((l) => `${l}L`).join(', ');
      return {
        eligible: false,
        reason: `This exam is for ${label} students. You are in ${studentLevel}L.`,
      };
    }
  }
  // No exam.levels → no level restriction, open to all registered students.

  // ── Department check ──────────────────────────────────────────────────────
  if (exam.department) {
    const allowed = exam.department
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const studentDept = student.department?.name?.trim().toLowerCase() ?? '';
    if (allowed.length > 0 && !allowed.includes(studentDept)) {
      return { eligible: false, reason: `This exam is restricted to: ${exam.department}.` };
    }
  }

  return { eligible: true };
}

// ─── Aliases ──────────────────────────────────────────────────────────────────

export const getExamsForStudent = listExamsForStudent;

export async function getQuestionsByExam(examId: string) {
  const prisma = await getPrismaClient();
  return prisma.question.findMany({
    where: { examId },
    include: {
      options: { orderBy: { orderIndex: 'asc' } },
      fitbAnswers: true,
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
}

// ─── Modification eligibility ──────────────────────────────────────────────

/**
 * An exam can be edited or deleted as long as no student has actually
 * started it. Status alone isn't the right gate — a "scheduled" or even
 * "active" exam with zero started sessions is still safe to edit/delete.
 */
export async function canModifyExam(examId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const startedSession = await prisma.examSession.findFirst({
    where: {
      examId,
      status: { not: 'not_started' }, // in_progress, submitted, force_submitted, etc.
    },
    select: { id: true },
  });
  return !startedSession;
}

export async function deleteExam(id: string, lecturerId: string) {
  const prisma = await getPrismaClient();

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { createdBy: true },
  });

  if (!exam) return { ok: false as const, reason: 'Exam not found.' };
  if (exam.createdBy !== lecturerId) {
    return { ok: false as const, reason: 'You do not own this exam.' };
  }

  const modifiable = await canModifyExam(id);
  if (!modifiable) {
    return {
      ok: false as const,
      reason: 'This exam already has student activity and cannot be deleted.',
    };
  }

  await prisma.exam.delete({ where: { id } });
  return { ok: true as const };
}