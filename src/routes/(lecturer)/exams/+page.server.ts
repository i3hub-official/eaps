// src/routes/(lecturer)/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { getExamsByLecturer } from '$lib/server/db/exams.js';
import { db } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const exams = await getExamsByLecturer(locals.user!.id);

  // Get courses belonging to this lecturer's department
  const { rows: courses } = await db.query(
    `SELECT c.id, c.code, c.title, c.level FROM courses c
     WHERE c.department_id = (
       SELECT department_id FROM users WHERE id = $1
     ) ORDER BY c.code`,
    [locals.user!.id]
  );

  return { exams, courses };
};
