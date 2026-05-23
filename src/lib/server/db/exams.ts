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
  courseId: string; createdBy: string; title: string; instructions?: string;
  durationMinutes?: number; totalMarks?: number; passMark?: number;
  scheduledStart?: Date; scheduledEnd?: Date; allowLateEntry?: boolean;
  lateEntryMinutes?: number; randomizeQuestions?: boolean; randomizeOptions?: boolean;
  showResultAfter?: boolean; maxViolations?: number; session: string; semester: number;
}) {
  return prisma.exam.create({ data: input });
}

export async function updateExam(id: string, input: Partial<{
  title: string; instructions: string; durationMinutes: number; totalMarks: number;
  passMark: number; status: ExamStatus; scheduledStart: Date | null;
  scheduledEnd: Date | null; allowLateEntry: boolean; lateEntryMinutes: number;
  randomizeQuestions: boolean; randomizeOptions: boolean;
  showResultAfter: boolean; maxViolations: number;
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
    include: { invigilator: { select: { id: true, fullName: true, email: true, staffId: true } } },
  });
}

// ─── Aliases (compatibility) ──────────────────────────────────────────────────

export const getExamsForStudent  = listExamsForStudent;
export const getQuestionsByExam  = (examId: string) => {
  // re-exported from questions.ts via db.ts barrel;
  // kept here because some routes import from exams.ts directly
  return prisma.question.findMany({
    where: { examId },
    include: { options: { orderBy: { orderIndex: 'asc' } }, fitbAnswers: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
};