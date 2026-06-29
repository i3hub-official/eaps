// src/routes/lecturer/questions/[questionId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { questionId } = params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      exam: {
        include: {
          course: true
        }
      },
      options: {
        orderBy: { orderIndex: 'asc' }
      },
      fitbAnswers: true,
      _count: {
        select: {
          studentAnswers: true
        }
      }
    }
  });

  if (!question) throw error(404, 'Question not found');
  if (question.exam.createdBy !== user.id) throw error(403, 'You do not own this question');

  // Get usage stats
  const usageStats = {
    totalAttempts: question._count.studentAnswers,
    correctCount: await prisma.studentAnswer.count({
      where: {
        questionId: question.id,
        isCorrect: true
      }
    }),
    incorrectCount: await prisma.studentAnswer.count({
      where: {
        questionId: question.id,
        isCorrect: false
      }
    })
  };

  const correctRate = usageStats.totalAttempts > 0 
    ? Math.round((usageStats.correctCount / usageStats.totalAttempts) * 100) 
    : 0;

  return {
    question,
    usageStats,
    correctRate
  };
};