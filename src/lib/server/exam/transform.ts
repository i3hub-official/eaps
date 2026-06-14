// src/lib/server/exam/transform.ts
import type { Exam as PrismaExam, StudentAnswer } from '@prisma/client';
import type {
  Exam as ClientExam,
  ExamSession as ClientExamSession,
  ClientQuestion,
  SavedAnswer,
} from '$lib/types/exam.js';
import type { SafeQuestion } from './randomizer.js';

type ExamWithCourse = PrismaExam & {
  course?: { code: string; title: string; departmentId: string } | null;
};

export function toClientExam(exam: ExamWithCourse): ClientExam {
  return {
    id: exam.id,
    course_id: exam.courseId,
    course_code: exam.course?.code,
    course_title: exam.course?.title,
    created_by: exam.createdBy,
    title: exam.title,
    instructions: exam.instructions,
    duration_minutes: exam.durationMinutes,
    total_marks: exam.totalMarks,
    pass_mark: exam.passMark,
    status: exam.status,
    scheduled_start: exam.scheduledStart,
    scheduled_end: exam.scheduledEnd,
    randomize_questions: exam.randomizeQuestions,
    randomize_options: exam.randomizeOptions,
    show_result_after: exam.showResultAfter,
    max_violations: exam.maxViolations,
    session: exam.session,
    semester: exam.semester,
    created_at: exam.createdAt,
  };
}

export function toClientSession(
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
  timeRemainingSecs: number | null
): ClientExamSession {
  return {
    id: session.id,
    exam_id: session.examId,
    student_id: session.studentId,
    status: session.status as ClientExamSession['status'],
    started_at: session.startedAt,
    submitted_at: session.submittedAt,
    time_remaining_secs: timeRemainingSecs,
    violation_count: session.violationCount,
    score: session.score == null ? null : Number(session.score),
  };
}

export function toClientQuestions(questions: SafeQuestion[]): ClientQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    exam_id: q.examId,
    type: q.type,
    body: q.body,
    image_url: q.imageUrl,
    marks: q.marks,
    display_index: q.displayIndex ?? 0,
    options: (q.options ?? []).map((o) => ({
      id: o.id,
      option_text: o.optionText,
      display_index: o.orderIndex ?? 0,
    })),
  }));
}

export function toSavedAnswers(answers: StudentAnswer[]): Record<string, SavedAnswer> {
  const map: Record<string, SavedAnswer> = {};
  for (const a of answers) {
    map[a.questionId] = {
      questionId: a.questionId,
      selectedOption: a.selectedOption ?? null,
      textAnswer: a.textAnswer ?? null,
    };
  }
  return map;
}