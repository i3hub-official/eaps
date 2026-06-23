// src/routes/(student)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { SessionStatus } from '$lib/constants/enums.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  await requireStudent(locals.user);
  const user = locals.user!;
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
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: { in: [SessionStatus.in_progress, SessionStatus.active] },
      },
    }),
    prisma.examResult.count({
      where: { studentId: user.id },
    }),
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: SessionStatus.not_started,
        exam: { scheduledStart: { gt: new Date() } },
      },
    }),
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
    prisma.examSession.findFirst({
      where: {
        studentId: user.id,
        status: { in: [SessionStatus.in_progress, SessionStatus.active] },
      },
      include: { exam: { select: { title: true } } },
    }),
    prisma.examResult.aggregate({
      where: {
        studentId: user.id,
        percentage: { not: null },
      },
      _avg: {
        percentage: true,
      },
    }),
    prisma.examSession.count({
      where: {
        studentId: user.id,
        status: SessionStatus.submitted,
      },
    }),
    prisma.courseRegistration.count({
      where: {
        studentId: user.id,
        session: currentSession,
        semester: currentSemester,
      },
    }),
  ]);

  const registrationsWithCourses = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        select: { creditUnits: true },
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
    activeExamSession: activeExamSession
      ? { id: activeExamSession.id, examTitle: activeExamSession.exam.title }
      : null,
  };
};

// ── Session derivation ────────────────────────────────────────────────────────
function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}