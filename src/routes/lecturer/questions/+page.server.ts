// src/routes/lecturer/questions/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all questions created by this lecturer (via their exams)
  const questions = await sql<{
    id: string;
    body: string;
    type: string;
    marks: number;
    topic: string;
    examId: string;
    examTitle: string;
    courseCode: string;
    createdAt: Date;
    optionCount: number;
    usageCount: number;
  }>(
    `SELECT
       q.id,
       q.body,
       q.type,
       q.marks,
       q.topic,
       q.exam_id AS "examId",
       e.title AS "examTitle",
       c.code AS "courseCode",
       q.created_at AS "createdAt",
       (SELECT COUNT(*) FROM question_options WHERE question_id = q.id)::int AS "optionCount",
       (SELECT COUNT(*) FROM student_answers WHERE question_id = q.id)::int AS "usageCount"
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     JOIN courses c ON c.id = e.course_id
     WHERE e.created_by = $1::uuid
     ORDER BY q.created_at DESC
     LIMIT 100`,
    [user.id]
  );

  // Get question type counts
  const typeCounts = await sql<{
    type: string;
    count: number;
  }>(
    `SELECT
       q.type,
       COUNT(*)::int AS count
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     WHERE e.created_by = $1::uuid
     GROUP BY q.type
     ORDER BY count DESC`,
    [user.id]
  );

  // Get topic counts
  const topicCounts = await sql<{
    topic: string;
    count: number;
  }>(
    `SELECT
       COALESCE(q.topic, 'Uncategorized') AS topic,
       COUNT(*)::int AS count
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     WHERE e.created_by = $1::uuid
     GROUP BY q.topic
     ORDER BY count DESC
     LIMIT 10`,
    [user.id]
  );

  // Get exam counts
  const examCounts = await sql<{
    examId: string;
    examTitle: string;
    courseCode: string;
    count: number;
  }>(
    `SELECT
       e.id AS "examId",
       e.title AS "examTitle",
       c.code AS "courseCode",
       COUNT(q.id)::int AS count
     FROM exams e
     LEFT JOIN questions q ON q.exam_id = e.id
     JOIN courses c ON c.id = e.course_id
     WHERE e.created_by = $1::uuid
     GROUP BY e.id, e.title, c.code
     HAVING COUNT(q.id) > 0
     ORDER BY count DESC
     LIMIT 10`,
    [user.id]
  );

  // Get total stats
  const stats = await sql<{
    totalQuestions: number;
    totalExams: number;
    totalMcq: number;
    totalTrueFalse: number;
    totalFitb: number;
    totalEssay: number;
  }>(
    `SELECT
       COUNT(DISTINCT q.id)::int AS "totalQuestions",
       COUNT(DISTINCT e.id)::int AS "totalExams",
       COUNT(*) FILTER (WHERE q.type = 'mcq')::int AS "totalMcq",
       COUNT(*) FILTER (WHERE q.type = 'true_false')::int AS "totalTrueFalse",
       COUNT(*) FILTER (WHERE q.type = 'fill_in_the_blank')::int AS "totalFitb",
       COUNT(*) FILTER (WHERE q.type = 'essay')::int AS "totalEssay"
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     WHERE e.created_by = $1::uuid`,
    [user.id]
  );

  return {
    questions: questions || [],
    typeCounts: typeCounts || [],
    topicCounts: topicCounts || [],
    examCounts: examCounts || [],
    stats: stats[0] || {
      totalQuestions: 0,
      totalExams: 0,
      totalMcq: 0,
      totalTrueFalse: 0,
      totalFitb: 0,
      totalEssay: 0
    },
    totalQuestions: questions.length,
  };
};