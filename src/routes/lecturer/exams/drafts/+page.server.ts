// src/routes/lecturer/exams/drafts/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  const drafts = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: 'draft'
    },
    include: {
      course: {
        select: {
          code: true,
          title: true
        }
      },
      _count: {
        select: {
          questions: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get stats for each draft
  const draftStats = await Promise.all(
    drafts.map(async (exam) => {
      const stats = await prisma.examSession.count({
        where: {
          examId: exam.id
        }
      });
      return {
        examId: exam.id,
        studentCount: stats
      };
    })
  );

  const statsMap = Object.fromEntries(
    draftStats.map(s => [s.examId, { total: s.studentCount }])
  );

  return {
    drafts,
    statsMap,
    draftCount: drafts.length
  };
};