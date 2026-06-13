// src/routes/(student)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { SessionStatus } from '$lib/constants/enums.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);
          const prisma = await getPrismaClient();

  // Fetch full student profile with all relations
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      college: true,
      level: true,
      programme: true,
      faceDescriptor: {
        select: { studentId: true, enrolledAt: true },
      },
    },
  });

  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  const [
    notifications,
    activeExams,
    totalResults,
    upcomingExams,
    totalRegistrations,
    activeExamSession,
    averageScore,
    completedExams,
    totalCourses,
  ] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // Active exams (in_progress or active)
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: { in: [SessionStatus.in_progress, SessionStatus.active] },
      },
    }),
    // Total results
    prisma.examResult.count({
      where: { studentId: user.id },
    }),
    // Upcoming exams
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: SessionStatus.not_started,
        exam: { scheduledStart: { gt: new Date() } },
      },
    }),
    // Total course registrations for current session/semester
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
    // Active exam session
    prisma.examSession.findFirst({
      where: {
        studentId: user.id,
        status: { in: [SessionStatus.in_progress, SessionStatus.active] },
      },
      include: { exam: { select: { title: true } } },
    }),
    // Average score from completed exams
    prisma.examResult.aggregate({
      where: {
        studentId: user.id,
        percentage: { not: null },
      },
      _avg: {
        percentage: true,
      },
    }),
    // Count completed exams
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: SessionStatus.submitted,
      },
    }),
    // Count total courses (through registrations)
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
  ]);

  // Calculate total credit hours by joining with Course table
  const registrationsWithCourses = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        select: {
          creditUnits: true,
        },
      },
    },
  });

  const totalCreditHours = registrationsWithCourses.reduce(
    (sum, reg) => sum + (reg.course.creditUnits || 0),
    0
  );

  return {
    user: {
      ...user,
      ...fullUser,
      enrolled: !!fullUser?.faceDescriptor,
    },
    notifications,
    stats: {
      activeExams,
      totalResults,
      upcomingExams,
      totalRegistrations,
      averageScore: Math.round(averageScore._avg.percentage ?? 0),
      completedExams,
      totalCreditHours,
      totalCourses,
    },
    activeExamSession: activeExamSession ? {
      id: activeExamSession.id,
      examTitle: activeExamSession.exam.title,
    } : null,
  };
};

// ── Session derivation ────────────────────────────────────────────────────────
function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 10) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}