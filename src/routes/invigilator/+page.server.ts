// src/routes/(invigilator)/invigilator/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireInvigilator } from '$lib/server/auth/guards.js';
import { listExamsForInvigilator } from '$lib/server/db/exams.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireInvigilator(locals.user);
  const exams = await listExamsForInvigilator(user.id);

  // If only one active exam, go straight to monitor
  const active = exams.find(e => e.status === 'active');
  if (active) redirect(302, `/invigilator/monitor/${active.id}`);

  return { exams };
};