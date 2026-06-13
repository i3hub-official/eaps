// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
          const prisma = await getPrismaClient();

  // Current session/semester from active AcademicSemester
  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
    select: { session: true, semester: true },
  });

  const [
    availableExams,
    recentResults,
    registeredCourses,
    resultStats,
  ] = await Promise.all([

    // Exams this student can take: active or scheduled, department/level match
    prisma.exam.findMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        // Filter by student's level
        ...(user.levelId ? {
          OR: [
            { examLevels: { some: { levelId: user.levelId } } },
            { levels:     { some: { id: user.levelId } } },
          ],
        } : {}),
        // Filter by student's department
        ...(user.departmentId ? {
          OR: [
            { examDepartments: { some: { departmentId: user.departmentId } } },
            { course: { departmentId: user.departmentId } },
          ],
        } : {}),
        // Exclude exams already completed by this student
        examSessions: {
          none: {
            studentId: user.id,
            status: { in: ['submitted', 'force_submitted'] },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { scheduledStart: 'asc' }],
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        scheduledStart: true,
        questionsToPresent: true,
        course: { select: { code: true, title: true } },
        _count: { select: { questions: true } },
      },
    }),

    // Most recent exam results for this student
    prisma.examResult.findMany({
      where: { studentId: user.id },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        percentage: true,
        score: true,
        passed: true,
        grade: true,
        generatedAt: true,
        exam: {
          select: {
            title: true,
            course: { select: { code: true } },
          },
        },
      },
    }),

    // Registered courses for the current semester
    prisma.courseRegistration.findMany({
      where: {
        studentId: user.id,
        ...(activeSemester ? {
          session:  activeSemester.session,
          semester: activeSemester.semester,
        } : {}),
        status: { in: ['pending', 'approved'] },
      },
      select: {
        id: true,
        registrationType: true,
        status: true,
        course: {
          select: {
            code: true,
            title: true,
            creditUnits: true,
            semester: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),

    // Average score across all results
    prisma.examResult.aggregate({
      where: { studentId: user.id },
      _avg: { percentage: true },
      _count: { id: true },
    }),
  ]);

  // Count upcoming exams (scheduled and not yet sat)
  const upcomingCount = availableExams.filter(e => e.status === 'scheduled').length;
  const activeCount   = availableExams.filter(e => e.status === 'active').length;

  return {
    stats: {
      activeExams:   activeCount,
      upcomingExams: upcomingCount,
      totalResults:  resultStats._count.id,
      averageScore:  Math.round(Number(resultStats._avg.percentage ?? 0)),
    },
    availableExams,
    recentResults,
    registeredCourses,
    activeSemester,
  };
};