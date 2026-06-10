// src/routes/student/courses/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const currentSession  = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  // ── Registered courses for this session/semester ──────────────────────
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session:   currentSession,
      semester:  currentSemester,
    },
    include: {
      course: {
        include: {
          department: { select: { name: true, code: true } },
          exams: {
            where: { session: currentSession, semester: currentSemester },
            select: { id: true, title: true, status: true, scheduledStart: true },
          },
        },
      },
      level: { select: { level: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    registrations: registrations.map(r => ({
      id:               r.id,
      courseId:         r.courseId,
      courseCode:       r.course.code,
      courseTitle:      r.course.title,
      creditUnits:      r.course.creditUnits,
      department:       r.course.department?.name ?? '—',
      semester:         r.semester,
      registrationType: r.registrationType,
      status:           r.status,
      level:            r.level?.level ?? '—',
      exams: r.course.exams.map(e => ({
        id:             e.id,
        title:          e.title,
        status:         e.status,
        scheduledStart: e.scheduledStart,
      })),
      registeredAt: r.createdAt,
    })),
    meta: {
      session:      currentSession,
      semester:     currentSemester,
      totalCredits: registrations.reduce((s, r) => s + r.course.creditUnits, 0),
    },
  };
};

function deriveSessionFromDate(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 9 ? 2 : 1;
}