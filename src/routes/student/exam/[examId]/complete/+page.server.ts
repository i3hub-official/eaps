import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { requireFaceVerified } from '$lib/server/auth/face-guard.js';
import { prisma } from '$lib/server/db/prisma.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = await requireStudent(locals.user);
  const examId = params.examId;

  // Face verification guard
  await requireFaceVerified(user.id, examId);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      questions: {
        include: { options: true, fitbAnswers: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.status !== 'active') throw error(403, 'Exam is not currently active');

  // Get or create session
  let session = await prisma.examSession.findUnique({
    where: { examId_studentId: { examId, studentId: user.id } },
  });

  if (!session) {
    session = await prisma.examSession.create({
      data: {
        examId,
        studentId: user.id,
        status: 'in_progress',
        startedAt: new Date(),
        timeRemainingSecs: exam.durationMinutes * 60,
        ipAddress: locals.ipAddress,
      },
    });
  }

  if (session.status === 'submitted' || session.status === 'force_submitted') {
    throw error(403, 'You have already submitted this exam');
  }

  // Randomize if needed (only on first start)
  // ... existing randomization logic ...

  return { exam, session, user };
};