// src/lib/server/db/exams.ts
import { prisma } from './index.js';
import type { Exam, ExamStatus } from '@prisma/client';

export type { Exam, ExamStatus };

const withCourse = {
  course: { select: { code: true, title: true, departmentId: true } },
} as const;

export async function getExamById(id: string) {
  return prisma.exam.findUnique({ where: { id } });
}

export async function getExamWithCourse(id: string) {
  return prisma.exam.findUnique({ where: { id }, include: withCourse });
}

export async function listExamsByLecturer(lecturerId: string) {
  return prisma.exam.findMany({
    where: { createdBy: lecturerId },
    include: withCourse,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listExamsForStudent(studentId: string) {
  return prisma.exam.findMany({
    where: {
      status: { in: ['scheduled', 'active'] },
      course: { registrations: { some: { studentId } } },
    },
    include: withCourse,
    orderBy: { scheduledStart: 'asc' },
  });
}

export async function listExamsForInvigilator(invigilatorId: string) {
  return prisma.exam.findMany({
    where: {
      status: { in: ['scheduled', 'active'] },
      invigilators: { some: { invigilatorId } },
    },
    include: withCourse,
    orderBy: { scheduledStart: 'asc' },
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
  session: string;
  semester: number;
  // ── Scope ──────────────────────────────────────────────
  levels?: number[];      // [] = no restriction (all levels)
  department?: string | null; // null = no restriction
}) {
  const { levels, department, ...rest } = input;
  return prisma.exam.create({
    data: {
      ...rest,
      levels:     levels     ?? [],
      department: department ?? null,
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
  // ── Scope ──────────────────────────────────────────────
  levels: number[];
  department: string | null;
}>) {
  return prisma.exam.update({ where: { id }, data: input });
}

export async function setExamStatus(id: string, status: ExamStatus) {
  await prisma.exam.update({ where: { id }, data: { status } });
}

export async function deleteExam(id: string) {
  await prisma.exam.deleteMany({ where: { id, status: 'draft' } });
}

export async function assignInvigilator(examId: string, invigilatorId: string) {
  await prisma.examInvigilator.upsert({
    where: { examId_invigilatorId: { examId, invigilatorId } },
    create: { examId, invigilatorId },
    update: {},
  });
}

export async function removeInvigilator(examId: string, invigilatorId: string) {
  await prisma.examInvigilator.delete({
    where: { examId_invigilatorId: { examId, invigilatorId } },
  });
}

export async function getExamInvigilators(examId: string) {
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

/**
 * Returns true if the student is eligible to sit the exam based on
 * the exam's level and department scope.
 *
 * Rules:
 *   • levels  = []   → no level restriction (all levels allowed)
 *   • levels  = [100, 300] → only those levels
 *   • department = null  → no department restriction
 *   • department = "Computer Science, Mathematics" → comma-separated list
 */
export function isStudentEligible(
  exam: { levels: number[]; department: string | null },
  student: { level: number | null; department: { name: string } | null },
): { eligible: boolean; reason?: string } {
  // Level check
  if (exam.levels.length > 0) {
    if (student.level === null || !exam.levels.includes(student.level)) {
      const allowed = exam.levels.map(l => `${l}L`).join(', ');
      return {
        eligible: false,
        reason: `This exam is restricted to ${allowed} students.`,
      };
    }
  }

  // Department check
  if (exam.department) {
    const allowed = exam.department
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const studentDept = student.department?.name?.trim().toLowerCase() ?? '';
    if (!allowed.includes(studentDept)) {
      return {
        eligible: false,
        reason: `This exam is restricted to: ${exam.department}.`,
      };
    }
  }

  return { eligible: true };
}

// ─── Aliases (compatibility) ──────────────────────────────────────────────────

export const getExamsForStudent = listExamsForStudent;

export const getQuestionsByExam = (examId: string) => {
  // re-exported from questions.ts via db.ts barrel;
  // kept here because some routes import from exams.ts directly
  return prisma.question.findMany({
    where: { examId },
    include: {
      options: { orderBy: { orderIndex: 'asc' } },
      fitbAnswers: true,
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
};