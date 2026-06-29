// src/routes/lecturer/questions/favorites/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get favorite questions for this lecturer
  const favorites = await sql<{
    id: string;
    body: string;
    type: string;
    marks: number;
    topic: string;
    examTitle: string;
    courseCode: string;
    createdAt: Date;
    favoritedAt: Date;
    usageCount: number;
    optionCount: number;
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
       f.created_at AS "favoritedAt",
       (SELECT COUNT(*) FROM student_answers WHERE question_id = q.id)::int AS "usageCount",
       (SELECT COUNT(*) FROM question_options WHERE question_id = q.id)::int AS "optionCount"
     FROM question_favorites f
     JOIN questions q ON q.id = f.question_id
     JOIN exams e ON e.id = q.exam_id
     JOIN courses c ON c.id = e.course_id
     WHERE f.user_id = $1::uuid
     ORDER BY f.created_at DESC
     LIMIT 100`,
    [user.id]
  );

  // Get favorite stats
  const stats = await sql<{
    totalFavorites: number;
    byType: string;
    count: number;
  }>(
    `SELECT
       q.type AS "byType",
       COUNT(*)::int AS count
     FROM question_favorites f
     JOIN questions q ON q.id = f.question_id
     WHERE f.user_id = $1::uuid
     GROUP BY q.type
     ORDER BY count DESC`,
    [user.id]
  );

  return {
    favorites: favorites || [],
    stats: stats || [],
    totalFavorites: favorites.length
  };
};