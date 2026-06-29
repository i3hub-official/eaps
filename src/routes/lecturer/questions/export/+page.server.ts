// src/routes/lecturer/questions/export/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all questions for export
  const questions = await sql<{
    id: string;
    body: string;
    type: string;
    marks: number;
    topic: string;
    examTitle: string;
    courseCode: string;
    createdAt: Date;
    options: string;
    fitbAnswers: string;
  }>(
    `SELECT
       q.id,
       q.body,
       q.type,
       q.marks,
       q.topic,
       e.title AS "examTitle",
       c.code AS "courseCode",
       q.created_at AS "createdAt",
       COALESCE(
         (SELECT string_agg(option_text, '|' ORDER BY order_index) FROM question_options WHERE question_id = q.id),
         ''
       ) AS options,
       COALESCE(
         (SELECT string_agg(accepted_answer, '|' ORDER BY is_primary DESC) FROM fitb_answers WHERE question_id = q.id),
         ''
       ) AS "fitbAnswers"
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     JOIN courses c ON c.id = e.course_id
     WHERE e.created_by = $1::uuid
     ORDER BY q.created_at DESC`,
    [user.id]
  );

  // Get exam list for filtering
  const exams = await prisma.exam.findMany({
    where: {
      createdBy: user.id
    },
    include: {
      course: true
    },
    orderBy: {
      title: 'asc'
    }
  });

  return {
    questions: questions || [],
    exams,
    totalQuestions: questions.length
  };
};