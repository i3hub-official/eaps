// src/routes/(lecturer)/exams/[examId]/similarity/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getExamWithCourse } from '$lib/server/db/exams.js';
import { requireOwnership } from '$lib/server/auth/guards.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const exam = await getExamWithCourse(params.examId);
  if (!exam) error(404, 'Exam not found');
  requireOwnership(user, exam.createdBy);

  // Get all FITB text answers for this exam grouped by question
  const fitbAnswers = await sql<{
    question_id: string; question_body: string;
    student_name: string; matric_number: string | null;
    text_answer: string; is_correct: boolean;
  }>(
    `SELECT
       q.id   AS question_id,
       q.body AS question_body,
       u.full_name  AS student_name,
       u.matric_number,
       sa.text_answer,
       sa.is_correct
     FROM student_answers sa
     JOIN exam_sessions es ON es.id = sa.session_id
     JOIN questions q      ON q.id  = sa.question_id
     JOIN users u          ON u.id  = es.student_id
     WHERE es.exam_id  = $1
       AND q.type      = 'fill_in_the_blank'
       AND sa.text_answer IS NOT NULL
     ORDER BY q.order_index, u.full_name`,
    [exam.id]
  );

  // Get MCQ answers — flag students who chose same wrong option
  const mcqSuspicious = await sql<{
    question_body: string; option_text: string;
    student_names: string; count: number;
  }>(
    `SELECT
       q.body        AS question_body,
       qo.option_text,
       STRING_AGG(u.full_name, ', ' ORDER BY u.full_name) AS student_names,
       COUNT(*)::int AS count
     FROM student_answers sa
     JOIN exam_sessions es  ON es.id  = sa.session_id
     JOIN questions q       ON q.id   = sa.question_id
     JOIN question_options qo ON qo.id = sa.selected_option
     JOIN users u           ON u.id   = es.student_id
     WHERE es.exam_id       = $1
       AND q.type           = 'mcq'
       AND qo.is_correct    = false
       AND sa.selected_option IS NOT NULL
     GROUP BY q.id, q.body, qo.id, qo.option_text
     HAVING COUNT(*) >= 2
     ORDER BY count DESC, q.body`,
    [exam.id]
  );

  return { exam, fitbAnswers, mcqSuspicious };
};