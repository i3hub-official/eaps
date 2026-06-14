// engines/question-analysis.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const QuestionAnalysisEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();
    const q = params.q ?? '';

    const questions = await prisma.question.findMany({
      where: q ? {
        OR: [
          { body: { contains: q, mode: 'insensitive' } },
          { exam: { title: { contains: q, mode: 'insensitive' } } },
        ],
      } : undefined,
      include: {
        exam:           { select: { title: true, course: { select: { code: true } } } },
        studentAnswers: { select: { isCorrect: true, timeSpentSecs: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    return {
      questions: questions.map(q => {
        const attempts = q.studentAnswers.length;
        const correct  = q.studentAnswers.filter(a => a.isCorrect).length;
        const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
        const times    = q.studentAnswers.map(a => a.timeSpentSecs ?? 0).filter(t => t > 0);
        const avgTime  = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        return {
          id:             q.id.slice(0, 4),
          exam:           q.exam?.course?.code ?? '—',
          body:           q.body,
          type:           q.type,
          attempts, correct,
          accuracy:       parseFloat(accuracy.toFixed(1)),
          avgTime,
          difficulty:     accuracy >= 80 ? 'easy' : accuracy >= 50 ? 'medium' : 'hard',
          discrimination: 0.65,
        };
      }),
    };
  },
};

export default QuestionAnalysisEngine;