// src/routes/api/lecturer/exams/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExam, updateExamStatus } from '$lib/server/db/exams.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  if (!['lecturer', 'admin'].includes(locals.user.role)) error(403, 'Forbidden');

  const body = await request.json();

  if (!body.course_id || !body.title || !body.duration_minutes) {
    error(400, 'Missing required fields');
  }

  const exam = await createExam({
    course_id: body.course_id,
    created_by: locals.user.id,
    title: body.title,
    instructions: body.instructions || null,
    duration_minutes: Number(body.duration_minutes),
    total_marks: Number(body.total_marks) || 100,
    pass_mark: Number(body.pass_mark) || 40,
    randomize_questions: body.randomize_questions === 'true',
    randomize_options: body.randomize_options === 'true',
    show_result_after: body.show_result_after === 'true',
    max_violations: 5,
    session: body.session || '2024/2025',
    semester: Number(body.semester) || 1,
    scheduled_start: body.scheduled_start ? new Date(body.scheduled_start) : undefined,
    scheduled_end: body.scheduled_end ? new Date(body.scheduled_end) : undefined,
  });

  return json({ id: exam.id });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  const { exam_id, status } = await request.json();
  await updateExamStatus(exam_id, status);
  return json({ ok: true });
};
