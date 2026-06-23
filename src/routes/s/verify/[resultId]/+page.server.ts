// src/routes/s/verify/[resultId]/+page.server.ts
// Public route — no auth required.
import type { PageServerLoad } from './$types';
import { error }               from '@sveltejs/kit';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { mouauGrade }          from '$lib/server/exam/grader.js';

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

  const pct        = result.percentage != null ? Number(result.percentage) : null;
  const gradeInfo  = pct != null ? mouauGrade(pct) : null;
  const grade      = gradeInfo?.grade ?? result.grade ?? null;
  const passed     = gradeInfo?.passed ?? result.passed ?? null;

  return {
    verified: {
      studentName:  result.student.fullName.toUppercase(),
      matricNumber: result.student.matricNumber ?? '',
      department:   result.student.department?.name ?? '',
      courseCode:   result.exam.course.code,
      courseTitle:  result.exam.course.title,
      examTitle:    result.exam.title,
      score:        pct != null ? Math.round(pct) : null,
      grade,
      passed,
      session:      result.exam.session,
      semester:     result.exam.semester,
      submittedAt:  result.submittedAt?.toISOString() ?? null,
      issuedAt:     result.generatedAt.toISOString(),
    },
  };
};