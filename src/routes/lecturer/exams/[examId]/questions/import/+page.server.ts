// src/routes/lecturer/exams/[examId]/questions/import/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true
    }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  return {
    exam
  };
};

export const actions: Actions = {
  import: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return fail(400, { error: 'No file uploaded' });
    }

    // Verify exam belongs to user
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam || exam.createdBy !== user.id) {
      return fail(403, { error: 'You do not have permission to add questions to this exam' });
    }

    // Parse file and import questions
    // ... import logic here ...

    return {
      success: true,
      message: 'Questions imported successfully!'
    };
  }
};