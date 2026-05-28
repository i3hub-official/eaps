import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getStudentResults } from '$lib/server/db/results.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
  const results = await getStudentResults(user.id);
  return { results };
};