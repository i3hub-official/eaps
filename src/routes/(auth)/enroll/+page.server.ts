// src/routes/(auth)/enroll/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { isFaceEnrolled } from '$lib/server/db/faces.js';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const user = await requireStudent(cookies);
  const enrolled = await isFaceEnrolled(user.id);

  // If already enrolled and no force re-enroll param, go to dashboard
  if (enrolled && !url.searchParams.has('redo')) {
    redirect(302, '/dashboard');
  }

  return { user, enrolled };
};