// src/routes/admin/exams/[examId]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
    await requireAdmin(locals.user);
    const prisma = await getPrismaClient();


  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { include: { department: { include: { college: true } } } },
      lecturer: { select: { id: true, fullName: true, email: true, staffId: true } },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options: true,
          _count: { select: { studentAnswers: true } },
        },
      },
      examSessions: {
        include: {
          student: { select: { fullName: true, matricNumber: true } },
          examResult: { select: { score: true, percentage: true, passed: true, grade: true } },
          _count: { select: { violations: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      invigilators: {
        include: { invigilator: { select: { fullName: true, email: true } } },
      },
      _count: { select: { questions: true, examSessions: true, examResults: true } },
    },
  });

  if (!exam) error(404, 'Exam not found');

  const scoreStats = await prisma.examResult.aggregate({
    where: { examId: params.examId },
    _avg: { percentage: true, score: true },
    _max: { percentage: true },
    _min: { percentage: true },
    _count: { id: true },
  });

  const passCount = await prisma.examResult.count({ where: { examId: params.examId, passed: true } });

  return { exam, scoreStats, passCount };
};

export const actions: Actions = {
  updateStatus: async ({ request, locals, params }) => {
        const prisma = await getPrismaClient();

    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    const fd = await request.formData();
    const status = fd.get('status') as string;
    const allowed = ['draft','scheduled','active','completed','cancelled'];
    if (!allowed.includes(status)) return fail(400, { error: 'Invalid status' });

    await prisma.exam.update({ where: { id: params.examId }, data: { status: status as any } });
    return { success: true };
  },

  delete: async ({ locals, params }) => {
        const prisma = await getPrismaClient();

    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    await prisma.exam.delete({ where: { id: params.examId } });
    redirect(303, '/admin/exams');
  },
};