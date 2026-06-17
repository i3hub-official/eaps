// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
// src/routes/student/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
  const prisma = await getPrismaClient();

  const activeSemester = await prisma.academicSemester.findFirst({
    where: { isActive: true },
    select: { session: true, semester: true, id: true },
  });

  if (!activeSemester) {
    return {
      stats: { activeExams: 0, upcomingExams: 0, totalResults: 0, averageScore: 0 },
      availableExams: [],
      recentResults: [],
      registeredCourses: [],
      activeSemester: null,
    };
  }

  const [
    availableExams,
    recentResults,
    registeredCourses,
    resultStats,
  ] = await Promise.all([

    // ✅ FIXED: Only filter by registration, NOT by level
    prisma.exam.findMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        session: activeSemester.session,
        semester: activeSemester.semester,
        // ✅ Remove level filter - students can see exams for any level they're registered for
        course: {
          registrations: {
            some: {
              studentId: user.id,
              session: activeSemester.session,
              semester: activeSemester.semester,
              status: { in: ['pending', 'approved'] },
            },
          },
        },
        // Exclude exams already completed
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
        course: {
          select: {
            code: true,
            title: true,
            level: true,  // Include to show student what level course it is
            semester: true,
          }
        },
        _count: { select: { questions: true } },
        examLevels: {
          select: {
            level: {
              select: { level: true, name: true }
            }
          }
        },
      },
    }),

    // Recent results (current semester only)
    prisma.examResult.findMany({
      where: {
        studentId: user.id,
        exam: {
          session: activeSemester.session,
          semester: activeSemester.semester,
        }
      },
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
            course: { select: { code: true, level: true } },
          },
        },
      },
    }),

    // Registered courses for current semester
    prisma.courseRegistration.findMany({
      where: {
        studentId: user.id,
        session: activeSemester.session,
        semester: activeSemester.semester,
        status: { in: ['pending', 'approved'] },
      },
      select: {
        id: true,
        registrationType: true,
        status: true,
        session: true,
        semester: true,
        course: {
          select: {
            code: true,
            title: true,
            creditUnits: true,
            semester: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),

    // Average score
    prisma.examResult.aggregate({
      where: {
        studentId: user.id,
        exam: {
          session: activeSemester.session,
          semester: activeSemester.semester,
        }
      },
      _avg: { percentage: true },
      _count: { id: true },
    }),
  ]);

 return {
    stats: {
      activeExams:   availableExams.filter(e => e.status === 'active').length,
      upcomingExams: availableExams.filter(e => e.status === 'scheduled').length,
      totalResults:  resultStats._count.id,
      averageScore:  Math.round(Number(resultStats._avg.percentage ?? 0)),
    },
    availableExams,
    recentResults: recentResults.map(r => ({
      ...r,
      score:      r.score      ? Number(r.score)      : null,
      percentage: r.percentage ? Number(r.percentage) : null,
    })),
    registeredCourses,
    activeSemester,
    _debug: {
      studentId:   user.id,
      studentLevel: user.level?.level,
      semester:    `${activeSemester.session} - Semester ${activeSemester.semester}`,
      examCount:   availableExams.length,
    },
  };
};