// src/routes/admin/reports/question-analysis/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const searchQuery = url.searchParams.get('q') || '';

  const questions = await prisma.question.findMany({
    where: searchQuery
      ? {
          OR: [
            { body:  { contains: searchQuery, mode: 'insensitive' } },
            { exam:  { title: { contains: searchQuery, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    include: {
      exam:           { select: { title: true, course: { select: { code: true } } } },
      studentAnswers: { select: { isCorrect: true, timeSpentSecs: true } },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  const formatted = questions.map(q => {
    const attempts    = q.studentAnswers.length;
    const correct     = q.studentAnswers.filter(a => a.isCorrect).length;
    const accuracy    = attempts > 0 ? (correct / attempts) * 100 : 0;
    const times       = q.studentAnswers.map(a => a.timeSpentSecs ?? 0).filter(t => t > 0);
    const avgTime     = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    return {
      id:             q.id.slice(0, 4),
      exam:           q.exam?.course?.code ?? '—',
      body:           q.body,
      type:           q.type,
      attempts,
      correct,
      accuracy:       parseFloat(accuracy.toFixed(1)),
      avgTime,
      difficulty:     accuracy >= 80 ? 'easy' : accuracy >= 50 ? 'medium' : 'hard',
      discrimination: 0.65,
    };
  });

  return { questions: formatted };
};