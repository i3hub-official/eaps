// src/routes/lecturer/exams/create/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { createExam } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);

  // Fetch ALL courses with their departments — lecturers may teach across
  // departments, levels, and colleges. We load all courses so they can
  // select any course they administer.
  const courses = await prisma.course.findMany({
    include: { department: true },
    orderBy: { code: 'asc' },
  });

  // Also fetch all departments for the scope selector
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });

  return { user, courses, departments };
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

    // ── Scope: Levels ────────────────────────────────────────────────────────
    const levelsRaw = String(d.get('levels') ?? '').trim();
    const levels: number[] =
      !levelsRaw || levelsRaw === 'all'
        ? []  // empty = all levels allowed (no restriction)
        : levelsRaw.split(',').map(Number).filter(n => !isNaN(n) && n > 0);

    // ── Scope: Departments ───────────────────────────────────────────────────
    // Frontend sends comma-separated department NAMES (not IDs).
    // We store as-is in the nullable `department` string field.
    // If you want to store IDs instead, change the schema and frontend.
    const departmentRaw = String(d.get('department') ?? '').trim();
    const department    = departmentRaw || null;
    const questionsToPresent = Number(d.get('questions_to_present') ?? 0);

    // ── Validation ───────────────────────────────────────────────────────────
    if (!title)    return fail(400, { error: 'Title is required' });
    if (!courseId) return fail(400, { error: 'Course is required' });
    if (!session)  return fail(400, { error: 'Session is required' });

    // Validate scheduled times
    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
      return fail(400, { error: 'End time must be after start time' });
    }

    // Verify the course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return fail(400, { error: 'Selected course does not exist' });
    }

    const exam = await createExam({
      courseId,
      createdBy: user.id,
      title,
      instructions,
      durationMinutes,
      totalMarks,
      passMark,
      maxViolations,
      scheduledStart,
      scheduledEnd,
      session,
      semester,
      randomizeQuestions: randomizeQ,
      randomizeOptions: randomizeO,
      showResultAfter: showResult,
      levels,
      department,
      questionsToPresent,   // ← add this line
    });

    redirect(302, `/lecturer/exams/${exam.id}/questions`);
  },
};