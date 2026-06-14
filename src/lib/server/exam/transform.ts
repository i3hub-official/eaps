// src/lib/server/exam/transform.ts
import type { Exam as PrismaExam, StudentAnswer } from '@prisma/client';
import type {
  ExamConfig,
  ExamSessionState,
  Question,
  StudentAnswerInput,
  SessionStatus,
} from '$lib/types/exam.js';
import type { SafeQuestion } from './randomizer.js';

type ExamWithCourse = PrismaExam & {
  course?: { code: string; title: string; departmentId: string } | null;
};

export function toExamConfig(exam: ExamWithCourse): ExamConfig {
  return {
    id: exam.id,
    courseId: exam.courseId,
    courseCode: exam.course?.code,
    courseTitle: exam.course?.title,
    title: exam.title,
    instructions: exam.instructions,
    durationMinutes: exam.durationMinutes,
    totalMarks: exam.totalMarks,
    passMark: exam.passMark,
    status: exam.status,
    scheduledStart: exam.scheduledStart,
    scheduledEnd: exam.scheduledEnd,
    showResultAfter: exam.showResultAfter,
    maxViolations: exam.maxViolations,
  };
}

export function toSessionState(
  session: {
    id: string;
    examId: string;
    studentId: string;
    status: string;
    startedAt: Date | null;
    submittedAt: Date | null;
    violationCount: number;
    score: unknown;
  },
  timeRemainingSecs: number
): ExamSessionState {
  return {
    id: session.id,
    examId: session.examId,
    studentId: session.studentId,
    status: session.status as SessionStatus,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    timeRemainingSecs,
    violationCount: session.violationCount,
    score: session.score == null ? null : Number(session.score),
    currentQuestionIndex: 0,
  };
}

export function toClientQuestions(questions: SafeQuestion[]): Question[] {
  return questions.map((q) => ({
    id: q.id,
    examId: q.examId,
    type: q.type as Question['type'],
    body: q.body,
    topic: q.topic,
    imageUrl: q.imageUrl,
    marks: q.marks,
    displayIndex: q.displayIndex ?? 0,
    options: (q.options ?? []).map((o) => ({
      id: o.id,
      optionText: o.optionText,
      displayIndex: o.orderIndex ?? 0,
    })),
    fitbAnswers: [], // never sent during a live exam
  }));
}

export function toAnswerInputs(answers: StudentAnswer[]): StudentAnswerInput[] {
  return answers.map((a) => ({
    questionId: a.questionId,
    selectedOption: a.selectedOption ?? null,
    textAnswer: a.textAnswer ?? null,
  }));
}