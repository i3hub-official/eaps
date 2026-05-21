// src/routes/(student)/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { getExamsForStudent } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ locals }) => {
  const exams = await getExamsForStudent(locals.user!.id);
  return { exams };
};
