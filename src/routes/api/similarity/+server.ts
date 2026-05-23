// src/routes/api/similarity/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLecturerOrAdmin } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

export const GET: RequestHandler = async ({ url, locals }) => {
  requireLecturerOrAdmin(locals.user);

  const examId = url.searchParams.get('exam_id');
  if (!examId) error(400, 'exam_id required');

  const [mcq, fitb] = await Promise.all([
    sql(
      `SELECT q.body AS question_body, qo.option_text,
              STRING_AGG(u.full_name, ', ' ORDER BY u.full_name) AS student_names,
              COUNT(*)::int AS count
       FROM student_answers sa
       JOIN exam_sessions es    ON es.id   = sa.session_id
       JOIN questions q         ON q.id    = sa.question_id
       JOIN question_options qo ON qo.id   = sa.selected_option
       JOIN users u             ON u.id    = es.student_id
       WHERE es.exam_id = $1 AND q.type = 'mcq' AND qo.is_correct = false
       GROUP BY q.id, q.body, qo.id, qo.option_text
       HAVING COUNT(*) >= 2
       ORDER BY count DESC`,
      [examId]
    ),
    sql(
      `SELECT q.body AS question_body,
              sa.text_answer,
              STRING_AGG(u.full_name, ', ' ORDER BY u.full_name) AS student_names,
              COUNT(*)::int AS count
       FROM student_answers sa
       JOIN exam_sessions es ON es.id  = sa.session_id
       JOIN questions q      ON q.id   = sa.question_id
       JOIN users u          ON u.id   = es.student_id
       WHERE es.exam_id = $1 AND q.type = 'fill_in_the_blank'
         AND sa.text_answer IS NOT NULL AND TRIM(sa.text_answer) != ''
       GROUP BY q.id, q.body, LOWER(TRIM(sa.text_answer)), sa.text_answer
       HAVING COUNT(*) >= 2
       ORDER BY count DESC`,
      [examId]
    ),
  ]);

  return json({ mcq, fitb });
};