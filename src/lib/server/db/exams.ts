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

// ─── Active semester ────────────────────────────────────────────────────────

export async function getActiveAcademicSemester() {
  const prisma = await getPrismaClient();
  return prisma.academicSemester.findFirst({ where: { isActive: true } });
}

/**
 * Resolves which exam a student should land on when they open /student/exam
 * with no ?examId — an in-progress session wins (resume), otherwise the
 * first currently-active exam they're registered for and eligible for.
 */
export async function findCurrentExamForStudent(student: {
  id: string;
  level: { level: number } | null;
  department: { name: string } | null;
}): Promise<string | null> {
  const prisma = await getPrismaClient();

  const inProgress = await prisma.examSession.findFirst({
    where: { studentId: student.id, status: 'in_progress' },
    orderBy: { startedAt: 'desc' },
    select: { examId: true },
  });
  if (inProgress) return inProgress.examId;

  const active = await getActiveAcademicSemester();
  if (!active) return null;

  const candidates = await prisma.exam.findMany({
    where: {
      status: 'active',
      session: active.session,
      semester: active.semester,
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
    include: { ...withCourse, levels: { select: { level: true } } },
    orderBy: { scheduledStart: 'asc' },
  });

  for (const exam of candidates) {
    if (isStudentEligible(exam, student).eligible) return exam.id;
  }

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

// ─── Eligible-student counting (shared by lecturer + reports) ─────────────────

export async function countEligibleStudents(exam: {
  courseId: string;
  session: string;
  semester: number;
  levels: { level: number }[];
  department: string | null;
}): Promise<number> {
  const prisma = await getPrismaClient();

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      courseId: exam.courseId,
      session: exam.session,
      semester: exam.semester,
      status: { notIn: ['rejected', 'withdrawn'] },
    },
    select: {
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
    if (isStudentEligible(exam, r.student).eligible) count++;
  }
  return count;
}

// ─── Lecturer-facing queries ────────────────────────────────────────────────

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
      sessionCount: exam._count.examSessions,
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
        include: { invigilator: { select: { id: true, fullName: true, email: true, staffId: true } } },
      },
      _count: { select: { questions: true, examSessions: true } },
    },
  });
}

export async function createExam(input: {
  courseId: string;
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
  questionsToPresent?: number;  // ← added
  session: string;
  semester: number;
  levels?: number[];            // level.level values (e.g. 100, 200) — [] = no restriction
  department?: string | null;
}) {
  const prisma = await getPrismaClient();

  const { levels, department, questionsToPresent, ...rest } = input;

  // levels is a many-to-many through ExamLevel joined on level.level (the Int field).
  // We must use connect syntax, not a plain array.
  const levelConnect =
    levels && levels.length > 0
      ? { connect: levels.map((l) => ({ level: l })) }  // level is the @unique Int field
      : undefined;

  return prisma.exam.create({
    data: {
      ...rest,
      department:          department          ?? null,
      questionsToPresent:  questionsToPresent  ?? 0,
      ...(levelConnect ? { levels: levelConnect } : {}),
    },
  });
}

export async function updateExam(id: string, input: Partial<{
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
  questionsToPresent: number;   // ← added
  levels: number[];
  department: string | null;
}>) {
  const prisma = await getPrismaClient();

  const { levels, ...rest } = input;

  const levelConnect =
    levels !== undefined
      ? {
          // Replace the full set: disconnect all then reconnect
          set: levels.map((l) => ({ level: l })),
        }
      : undefined;

  return prisma.exam.update({
    where: { id },
    data: {
      ...rest,
      ...(levelConnect ? { levels: levelConnect } : {}),
    },
  });
}

export async function setExamStatus(id: string, status: ExamStatus) {
  const prisma = await getPrismaClient();

  await prisma.exam.update({ where: { id }, data: { status } });
}

export async function deleteExam(id: string) {
  const prisma = await getPrismaClient();

  await prisma.exam.deleteMany({ where: { id, status: 'draft' } });
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

// ─── Scope helpers ────────────────────────────────────────────────────────────

export function isStudentEligible(
  exam: { levels: { level: number }[]; department: string | null },
  student: { level: { level: number } | null; department: { name: string } | null },
): { eligible: boolean; reason?: string } {
  // Level check — exam.levels is now a Level[] relation, not number[]
  if (exam.levels.length > 0) {
    const allowed = exam.levels.map((l) => l.level);
    const studentLevel = student.level?.level ?? null;
    if (studentLevel === null || !allowed.includes(studentLevel)) {
      const label = allowed.map((l) => `${l}L`).join(', ');
      return { eligible: false, reason: `This exam is restricted to ${label} students.` };
    }
  }

  // Department check
  if (exam.department) {
    const allowed = exam.department
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const studentDept = student.department?.name?.trim().toLowerCase() ?? '';
    if (!allowed.includes(studentDept)) {
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