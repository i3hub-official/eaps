// src/routes/lecturer/exams/completed/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all completed exams
  const exams = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: 'completed'
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
      scheduledEnd: 'desc'
    }
  });

  // Get stats for each exam
  const examStats = await Promise.all(
    exams.map(async (exam) => {
      const stats = await sql<{ 
        total: number; 
        submitted: number; 
        avg_score: number;
        pass_count: number;
        fail_count: number;
      }>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('submitted','force_submitted'))::int AS submitted,
           COALESCE(ROUND(AVG(er.percentage)::numeric, 1), 0) AS avg_score,
           COUNT(*) FILTER (WHERE er.percentage >= $2::int)::int AS pass_count,
           COUNT(*) FILTER (WHERE er.percentage < $2::int AND er.percentage > 0)::int AS fail_count
         FROM exam_sessions es
         LEFT JOIN exam_results er ON er.session_id = es.id
         WHERE es.exam_id = $1::uuid`,
        [exam.id, exam.passMark]
      );
      return {
        examId: exam.id,
        total: stats[0]?.total || 0,
        submitted: stats[0]?.submitted || 0,
        avgScore: stats[0]?.avg_score || 0,
        passCount: stats[0]?.pass_count || 0,
        failCount: stats[0]?.fail_count || 0
      };
    })
  );

  const statsMap = Object.fromEntries(
    examStats.map(s => [s.examId, { 
      total: s.total, 
      submitted: s.submitted, 
      avgScore: s.avgScore,
      passCount: s.passCount,
      failCount: s.failCount
    }])
  );

  // Calculate overall stats
  const totalStudents = exams.reduce((acc, exam) => acc + (statsMap[exam.id]?.total || 0), 0);
  const totalPassed = Object.values(statsMap).reduce((acc: number, s: any) => acc + (s?.passCount || 0), 0);
  const totalFailed = Object.values(statsMap).reduce((acc: number, s: any) => acc + (s?.failCount || 0), 0);

  return {
    exams,
    statsMap,
    completedCount: exams.length,
    totalStudents,
    totalPassed,
    totalFailed
  };
};