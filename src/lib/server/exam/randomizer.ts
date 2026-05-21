import { sql } from '$lib/server/db/index.js';
import type { Question, QuestionOption, FitbAnswer } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionWithRelations = Question & {
  options: QuestionOption[];
  fitbAnswers: FitbAnswer[];
  displayIndex?: number;
};

export type SafeQuestion = Omit<QuestionWithRelations, 'fitbAnswers'> & {
  options: Omit<QuestionOption, 'isCorrect'>[];
  fitbAnswers: never[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function buildStudentQuestionOrder(
  sessionId: string,
  questions: QuestionWithRelations[],
  randomizeQuestions: boolean,
  randomizeOptions: boolean
): Promise<QuestionWithRelations[]> {

  const existing = await sql<{ question_id: string; display_index: number }>(
    `SELECT question_id, display_index
     FROM session_question_order
     WHERE session_id = $1
     ORDER BY display_index ASC`,
    [sessionId]
  );

  let orderedQuestions: QuestionWithRelations[];

  if (existing.length > 0) {
    const orderMap = new Map(existing.map((r) => [r.question_id, r.display_index]));
    orderedQuestions = [...questions].sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
    );
  } else {
    orderedQuestions = randomizeQuestions ? shuffle(questions) : [...questions];

    await sql(
      `INSERT INTO session_question_order (session_id, question_id, display_index)
       SELECT $1, unnest($2::uuid[]), unnest($3::int[])`,
      [
        sessionId,
        orderedQuestions.map((q) => q.id),
        orderedQuestions.map((_, i) => i),
      ]
    );
  }

  if (randomizeOptions) {
    const existingOptions = await sql<{
      question_id: string; option_id: string; display_index: number;
    }>(
      `SELECT question_id, option_id, display_index
       FROM session_option_order
       WHERE session_id = $1`,
      [sessionId]
    );

    if (existingOptions.length === 0) {
      for (const q of orderedQuestions) {
        if (q.type === 'mcq' && q.options?.length) {
          const shuffled = shuffle(q.options);
          await sql(
            `INSERT INTO session_option_order (session_id, question_id, option_id, display_index)
             SELECT $1, $2, unnest($3::uuid[]), unnest($4::int[])`,
            [sessionId, q.id, shuffled.map((o) => o.id), shuffled.map((_, i) => i)]
          );
          q.options = shuffled;
        }
      }
    } else {
      for (const q of orderedQuestions) {
        if (q.type === 'mcq' && q.options?.length) {
          const qOpts = existingOptions.filter((o) => o.question_id === q.id);
          const orderMap = new Map(qOpts.map((o) => [o.option_id, o.display_index]));
          q.options = [...q.options].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
          );
        }
      }
    }
  }

  return orderedQuestions.map((q, i) => ({ ...q, displayIndex: i }));
}

export function sanitizeQuestionsForClient(questions: QuestionWithRelations[]): SafeQuestion[] {
  return questions.map((q) => {
    const { fitbAnswers: _, ...rest } = q;
    return {
      ...rest,
      fitbAnswers: [] as never[],
      options: q.options.map(({ isCorrect: _, ...opt }) => opt),
    };
  });
}