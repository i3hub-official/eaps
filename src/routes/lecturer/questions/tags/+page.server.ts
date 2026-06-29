// src/routes/lecturer/questions/tags/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get all tags with question counts
  const tags = await sql<{
    tag: string;
    count: number;
    questionIds: string[];
  }>(
    `SELECT
       COALESCE(q.topic, 'Uncategorized') AS tag,
       COUNT(*)::int AS count,
       ARRAY_AGG(q.id) AS "questionIds"
     FROM questions q
     JOIN exams e ON e.id = q.exam_id
     WHERE e.created_by = $1::uuid
     GROUP BY q.topic
     ORDER BY count DESC`,
    [user.id]
  );

  // Get questions for each tag (top 5 per tag)
  const tagQuestions = await Promise.all(
    tags.map(async (tag) => {
      const questions = await sql<{
        id: string;
        body: string;
        type: string;
        marks: number;
        examTitle: string;
        courseCode: string;
      }>(
        `SELECT
           q.id,
           q.body,
           q.type,
           q.marks,
           e.title AS "examTitle",
           c.code AS "courseCode"
         FROM questions q
         JOIN exams e ON e.id = q.exam_id
         JOIN courses c ON c.id = e.course_id
         WHERE e.created_by = $1::uuid
           AND COALESCE(q.topic, 'Uncategorized') = $2
         ORDER BY q.created_at DESC
         LIMIT 5`,
        [user.id, tag.tag]
      );
      return {
        ...tag,
        questions: questions || []
      };
    })
  );

  return {
    tags: tagQuestions || [],
    totalTags: tags.length,
    totalQuestions: tags.reduce((acc, t) => acc + t.count, 0)
  };
};