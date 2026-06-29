// src/routes/lecturer/exams/scheduled/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all scheduled exams
  const exams = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: 'scheduled'
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
      scheduledStart: 'asc'
    }
  });

  // Get stats for each exam
  const examStats = await Promise.all(
    exams.map(async (exam) => {
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

  // Get upcoming count (within 7 days)
  const upcomingCount = exams.filter(e => 
    e.scheduledStart && new Date(e.scheduledStart) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).length;

  return {
    exams,
    statsMap,
    scheduledCount: exams.length,
    upcomingCount
  };
};