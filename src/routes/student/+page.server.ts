// src/routes/student/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { listExamsForStudent } from '$lib/server/db/exams.js';
import { getStudentResults } from '$lib/server/db/results.js';
import { isFaceEnrolled } from '$lib/server/db/faces.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  const [exams, results, enrolled] = await Promise.all([
    listExamsForStudent(user.id),
    getStudentResults(user.id),
    isFaceEnrolled(String(user.id)),
  ]);

  return { user, exams, results, enrolled };
};