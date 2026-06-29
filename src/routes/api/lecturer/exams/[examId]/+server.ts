// src/routes/api/lecturer/exams/[examId]/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { createdBy: true, status: true }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  // Only allow permanent deletion of cancelled or completed exams
  if (exam.status !== 'cancelled' && exam.status !== 'completed') {
    throw error(400, 'Only cancelled or completed exams can be permanently deleted');
  }

  // Delete related records first (cascading will handle most)
  await prisma.exam.delete({
    where: { id: examId }
  });

  return json({ success: true });
};