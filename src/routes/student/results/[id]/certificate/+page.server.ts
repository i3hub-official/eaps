import type { PageServerLoad } from './$types';
import { error }               from '@sveltejs/kit';
import { requireStudent }      from '$lib/server/auth/guards.js';
import { getPrismaClient }     from '$lib/server/db/index.js';
import { percentageToGrade }   from '$lib/server/exam/grader.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const user   = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  const result = await prisma.examResult.findUnique({
    where:   { id: params.id },
    include: {
      exam:    { include: { course: true } },
      student: {
        select: {
          fullName:     true,
          matricNumber: true,
          department:   { select: { name: true } },
          level:        { select: { level: true } },
        },
      },
    },
  });

  if (!result)                      throw error(404, 'Result not found');
  if (result.studentId !== user.id) throw error(403, 'Forbidden');
  if (!result.passed)               throw error(403, 'Certificate only available for passed exams');

  const pct   = result.percentage != null ? Number(result.percentage) : null;
  const grade = pct != null ? percentageToGrade(pct) : (result.grade ?? null);

  return {
    certificate: {
      resultId:    result.id,
      studentName: result.student.fullName.toUpperCase(),
      matricNumber:result.student.matricNumber ?? '',
      department:  result.student.department?.name ?? '',
      level:       result.student.level?.level ? `${result.student.level.level} Level` : '',
      courseCode:  result.exam.course.code,
      courseTitle: result.exam.course.title,
      examTitle:   result.exam.title,
      score:       pct != null ? Math.round(pct) : null,
      grade,
      session:     result.exam.session,
      semester:    result.exam.semester,
      submittedAt: result.submittedAt?.toISOString() ?? new Date().toISOString(),
      verifyUrl:    `https://etest.mouau.edu.ng/verify/${result.id}`,
    },
  };
};