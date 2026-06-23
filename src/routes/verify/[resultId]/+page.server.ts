import type { PageServerLoad } from './$types';
import { error }               from '@sveltejs/kit';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { percentageToGrade }   from '$lib/server/grading.js';

// Public route — no auth required
export const load: PageServerLoad = async ({ params }) => {
  const prisma = await getPrismaClient();

  const result = await prisma.examResult.findUnique({
    where:   { id: params.resultId },
    include: {
      exam:    { include: { course: true } },
      student: {
        select: {
          fullName:     true,
          matricNumber: true,
          department:   { select: { name: true } },
        },
      },
    },
  });

  if (!result) throw error(404, 'Result not found');

  const pct   = result.percentage != null ? Number(result.percentage) : null;
  const grade = pct != null ? percentageToGrade(pct) : (result.grade ?? null);

  return {
    verified: {
      studentName:  result.student.fullName,
      matricNumber: result.student.matricNumber ?? '',
      department:   result.student.department?.name ?? '',
      courseCode:   result.exam.course.code,
      courseTitle:  result.exam.course.title,
      examTitle:    result.exam.title,
      score:        pct != null ? Math.round(pct) : null,
      grade,
      passed:       result.passed,
      session:      result.exam.session,
      semester:     result.exam.semester,
      submittedAt:  result.submittedAt?.toISOString() ?? null,
      issuedAt:     result.generatedAt.toISOString(),
    },
  };
};