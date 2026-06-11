import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { requireOwnership } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  
  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: { course: true }
  });
  
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);
  
  // Get all results for this exam
  const results = await prisma.examResult.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          matricNumber: true,
          email: true
        }
      },
      session: true
    },
    orderBy: { percentage: 'desc' }
  });
  
  // Get statistics
  const stats = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*) as total_students,
      AVG(percentage) as avg_score,
      SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed_count,
      MAX(percentage) as highest_score,
      MIN(percentage) as lowest_score
    FROM exam_results
    WHERE exam_id = ${params.examId}::uuid
  `;
  
  return { exam, results, stats: stats[0] };
};