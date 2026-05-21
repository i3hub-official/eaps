import { prisma, sql, withTransaction } from './index.js';
import type { Question, QuestionOption, FitbAnswer, QuestionType } from '@prisma/client';

export type { Question, QuestionOption, FitbAnswer, QuestionType };

// ─── Prisma: simple CRUD ──────────────────────────────────────────────────────

export async function getQuestionById(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: { options: true, fitbAnswers: true },
  });
}

export async function getQuestionsForExam(examId: string) {
  return prisma.question.findMany({
    where: { examId },
    include: { options: { orderBy: { orderIndex: 'asc' } }, fitbAnswers: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createMCQ(input: {
  examId: string; body: string; imageUrl?: string; marks?: number; orderIndex?: number;
  options: { optionText: string; isCorrect: boolean; orderIndex?: number }[];
}) {
  return prisma.question.create({
    data: {
      examId: input.examId,
      type: 'mcq',
      body: input.body.trim(),
      imageUrl: input.imageUrl ?? null,
      marks: input.marks ?? 1,
      orderIndex: input.orderIndex ?? null,
      options: { create: input.options.map(o => ({ ...o, optionText: o.optionText.trim() })) },
    },
    include: { options: true, fitbAnswers: true },
  });
}

export async function createFITB(input: {
  examId: string; body: string; imageUrl?: string; marks?: number; orderIndex?: number;
  answers: { acceptedAnswer: string; isPrimary?: boolean }[];
}) {
  return prisma.question.create({
    data: {
      examId: input.examId,
      type: 'fill_in_the_blank',
      body: input.body.trim(),
      imageUrl: input.imageUrl ?? null,
      marks: input.marks ?? 1,
      orderIndex: input.orderIndex ?? null,
      fitbAnswers: { create: input.answers.map(a => ({ ...a, acceptedAnswer: a.acceptedAnswer.trim() })) },
    },
    include: { options: true, fitbAnswers: true },
  });
}

export async function updateQuestion(id: string, input: {
  body?: string; imageUrl?: string; marks?: number; orderIndex?: number;
}) {
  return prisma.question.update({ where: { id }, data: input });
}

export async function deleteQuestion(id: string) {
  await prisma.question.delete({ where: { id } });
}

export async function replaceOptions(
  questionId: string,
  options: { optionText: string; isCorrect: boolean; orderIndex?: number }[]
) {
  return prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId } }),
    prisma.questionOption.createMany({
      data: options.map(o => ({ ...o, questionId, optionText: o.optionText.trim() })),
    }),
  ]);
}

export async function getQuestionCount(examId: string): Promise<number> {
  return prisma.question.count({ where: { examId } });
}

// ─── Raw SQL: student session view (strips is_correct) ────────────────────────

export async function getSessionQuestions(sessionId: string) {
  return sql<{
    id: string; exam_id: string; type: QuestionType; body: string;
    image_url: string | null; marks: number; display_index: number;
    options: { id: string; option_text: string; display_index: number }[];
  }>(
    `SELECT
       q.id, q.exam_id, q.type, q.body, q.image_url, q.marks,
       sqo.display_index,
       COALESCE(
         json_agg(
           json_build_object(
             'id', qo.id,
             'option_text', qo.option_text,
             'display_index', soo.display_index
           ) ORDER BY soo.display_index
         ) FILTER (WHERE qo.id IS NOT NULL),
         '[]'
       ) AS options
     FROM session_question_order sqo
     JOIN questions q ON q.id = sqo.question_id
     LEFT JOIN session_option_order soo ON soo.session_id = sqo.session_id AND soo.question_id = q.id
     LEFT JOIN question_options qo ON qo.id = soo.option_id
     WHERE sqo.session_id = $1
     GROUP BY q.id, sqo.display_index
     ORDER BY sqo.display_index`,
    [sessionId]
  );
}
