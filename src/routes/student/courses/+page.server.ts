// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        include: {
          department: { select: { name: true } },
          exams: {
            where: {
              session: currentSession,
              semester: currentSemester,
            },
            select: {
              id: true,
              title: true,
              status: true,
              scheduledStart: true,
            },
          },
        },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Also fetch all available courses for the student's department/level
  // (for registration reference)
  const availableCourses = await prisma.course.findMany({
    where: {
      departmentId: user.departmentId ?? undefined,
      level: user.level?.level ?? undefined,
      semester: currentSemester,
    },
    include: {
      department: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
    take: 20,
  });

  return {
    registrations: registrations.map(r => ({
      id: r.id,
      courseId: r.courseId,
      courseCode: r.course.code,
      courseTitle: r.course.title,
      creditUnits: r.course.creditUnits,
      department: r.course.department?.name ?? '—',
      semester: r.semester,
      registrationType: r.registrationType,
      level: r.level?.level ?? r.level?.name ?? '—',
      exams: r.course.exams.map(e => ({
        id: e.id,
        title: e.title,
        status: e.status,
        scheduledStart: e.scheduledStart,
      })),
      registeredAt: r.createdAt,
    })),
    availableCourses: availableCourses.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      creditUnits: c.creditUnits,
      department: c.department?.name ?? '—',
      level: c.level ?? '—',
      semester: c.semester,
      registrationCount: c._count.registrations,
    })),
    meta: {
      session: currentSession,
      semester: currentSemester,
    },
  };
};

function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 10) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}