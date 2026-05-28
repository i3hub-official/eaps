// src/routes/(lecturer)/exams/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { createExam } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const courses = await prisma.course.findMany({
    where: { department: { users: { some: { id: user.id } } } },
    include: { department: true },
    orderBy: { code: 'asc' },
  });
  return { user, courses };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const d = await request.formData();

    const title           = String(d.get('title')            ?? '').trim();
    const courseId        = String(d.get('course_id')        ?? '').trim();
    const durationMinutes = Number(d.get('duration_minutes') ?? 60);
    const totalMarks      = Number(d.get('total_marks')      ?? 100);
    const passMark        = Number(d.get('pass_mark')        ?? 40);
    const maxViolations   = Number(d.get('max_violations')   ?? 5);
    const session         = String(d.get('session')          ?? '').trim();
    const semester        = Number(d.get('semester')         ?? 1);
    const scheduledStart  = d.get('scheduled_start') ? new Date(String(d.get('scheduled_start'))) : undefined;
    const scheduledEnd    = d.get('scheduled_end')   ? new Date(String(d.get('scheduled_end')))   : undefined;
    const instructions    = String(d.get('instructions')     ?? '').trim() || undefined;
    const randomizeQ      = d.get('randomize_questions') === 'on';
    const randomizeO      = d.get('randomize_options')   === 'on';
    const showResult      = d.get('show_result_after')   === 'on';

    if (!title)    return fail(400, { error: 'Title is required' });
    if (!courseId) return fail(400, { error: 'Course is required' });
    if (!session)  return fail(400, { error: 'Session is required' });

    const exam = await createExam({
      courseId, createdBy: user.id, title, instructions,
      durationMinutes, totalMarks, passMark, maxViolations,
      scheduledStart, scheduledEnd, session, semester,
      randomizeQuestions: randomizeQ, randomizeOptions: randomizeO, showResultAfter: showResult,
    });

    redirect(302, `/lecturer/exams/${exam.id}/questions`);
  },
};