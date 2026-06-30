// src/routes/invigilator/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { listExamsForInvigilator } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireInvigilatorOrAdmin(locals.user);
  const exams = await listExamsForInvigilator(user.id);
  return { exams };
};