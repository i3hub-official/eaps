// src/routes/student/verify/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async (event) => {
  const { student } = await requireStudent(event);
  const prisma = await getPrismaClient();

  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: student.id },
    select: { id: true },
  });

  const returnTo = event.url.searchParams.get('returnTo');

  if (!faceDescriptor) {
    const returnUrl = event.url.pathname + event.url.search;
    redirect(302, `/student/enroll?returnTo=${encodeURIComponent(returnUrl)}`);
  }

  const assessmentId = event.url.searchParams.get('examId'); // TODO: rename query param once frontend catches up
  const expired = event.url.searchParams.get('expired');

  if (assessmentId) {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        course: {
          registrations: {
            some: { studentId: student.id, status: { notIn: ['REJECTED', 'CANCELLED'] } },
          },
        },
        status: { in: ['ACTIVE', 'SCHEDULED'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        course: { select: { code: true, title: true } },
      },
    });

    if (!assessment) {
      error(404, 'Assessment not found or you are not registered for this course');
    }

    const existingSession = await prisma.assessmentSession.findFirst({
      where: {
        assessmentId: assessment.id,
        studentId: student.id,
        status: { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] },
      },
    });

    return {
      user: { id: student.id, name: `${student.firstName} ${student.lastName}` },
      exam: {
        id: assessment.id,
        title: assessment.title,
        courseCode: assessment.course.code,
        durationMinutes: assessment.durationMinutes,
        hasExistingSession: !!existingSession && existingSession.status === 'IN_PROGRESS',
        sessionId: existingSession?.id,
      },
      expired: !!expired,
      returnTo,
    };
  }

  return {
    user: { id: student.id, name: `${student.firstName} ${student.lastName}` },
    exam: null,
    expired: false,
    returnTo,
  };
};