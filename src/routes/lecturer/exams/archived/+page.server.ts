// src/routes/lecturer/exams/archived/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get archived exams (cancelled or completed with no upcoming schedule)
  const archived = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      OR: [
        { status: 'cancelled' },
        { 
          status: 'completed',
          scheduledEnd: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
          }
        }
      ]
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
          questions: true,
          examSessions: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Get stats for each archived exam
  const examStats = await Promise.all(
    archived.map(async (exam) => {
      const stats = await sql<{ total: number; submitted: number; avg_score: number }>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted,
           COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS avg_score
         FROM exam_sessions es
         LEFT JOIN exam_results er ON er.session_id = es.id
         WHERE es.exam_id = $1::uuid`,
        [exam.id]
      );
      return {
        examId: exam.id,
        total: stats[0]?.total || 0,
        submitted: stats[0]?.submitted || 0,
        avgScore: stats[0]?.avg_score || 0
      };
    })
  );

  const statsMap = Object.fromEntries(
    examStats.map(s => [s.examId, { total: s.total, submitted: s.submitted, avgScore: s.avgScore }])
  );

  // Get count of exams by status
  const cancelledCount = await prisma.exam.count({
    where: {
      createdBy: user.id,
      status: 'cancelled'
    }
  });

  const completedCount = await prisma.exam.count({
    where: {
      createdBy: user.id,
      status: 'completed',
      scheduledEnd: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });

  return {
    archived,
    statsMap,
    cancelledCount,
    completedCount,
    totalArchived: archived.length
  };
};