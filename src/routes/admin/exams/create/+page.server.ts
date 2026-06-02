// src/routes/admin/exams/create/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
    await requireAdmin(locals.user);
    
  const [courses, lecturers] = await prisma.$transaction([
    prisma.course.findMany({
      orderBy: { code: 'asc' },
      include: { department: { include: { college: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'lecturer', isActive: true },
      select: { id: true, fullName: true, staffId: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return { courses, lecturers };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);

    const fd = await request.formData();
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const title         = get('title');
    const courseId      = get('courseId');
    const createdBy     = get('createdBy');
    const session       = get('session');
    const semester      = Number(get('semester'));
    const durationMinutes = Number(get('durationMinutes') || 60);
    const totalMarks    = Number(get('totalMarks') || 100);
    const passMark      = Number(get('passMark') || 40);
    const scheduledStart = get('scheduledStart') || null;
    const scheduledEnd   = get('scheduledEnd') || null;
    const levels        = fd.getAll('levels').map(Number);

    if (!title || !courseId || !createdBy || !session || !semester) {
      return fail(400, { error: 'Please fill all required fields.' });
    }

    const exam = await prisma.exam.create({
      data: {
        title, courseId, createdBy, session, semester,
        durationMinutes, totalMarks, passMark,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd:   scheduledEnd   ? new Date(scheduledEnd)   : null,
        levels,
        randomizeQuestions: fd.get('randomizeQuestions') === 'on',
        randomizeOptions:   fd.get('randomizeOptions')   === 'on',
        showResultAfter:    fd.get('showResultAfter')    === 'on',
        allowLateEntry:     fd.get('allowLateEntry')     === 'on',
        maxViolations: Number(get('maxViolations') || 5),
        status: 'draft',
      },
    });

    redirect(303, `/admin/exams/${exam.id}`);
  },
};