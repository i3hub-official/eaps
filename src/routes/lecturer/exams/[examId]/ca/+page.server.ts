// src/routes/lecturer/exams/[examId]/ca/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      levels: true,
      departments: true,
      _count: {
        select: { examSessions: true }
      }
    }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  // Get students with their exam scores and CA scores
  const students = await sql<{
    id: string;
    fullName: string;
    email: string;
    matricNumber: string;
    examScore: number;
    caScore: number;
    totalScore: number;
    status: string;
  }>(
    `SELECT
       u.id,
       u.full_name AS "fullName",
       u.email,
       u.matric_number AS "matricNumber",
       COALESCE(er.percentage, 0) AS "examScore",
       COALESCE(ca.score, 0) AS "caScore",
       COALESCE(er.percentage, 0) + COALESCE(ca.score, 0) AS "totalScore",
       es.status
     FROM users u
     JOIN exam_sessions es ON es.user_id = u.id AND es.exam_id = $1::uuid
     LEFT JOIN exam_results er ON er.session_id = es.id
     LEFT JOIN continuous_assessment ca ON ca.exam_id = es.exam_id AND ca.user_id = u.id
     WHERE u.role = 'student'
     ORDER BY u.full_name`,
    [examId]
  );

  return {
    exam,
    students,
    totalStudents: students.length,
  };
};