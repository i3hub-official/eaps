// src/routes/shared/profile/+page.server.ts

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getProfileData } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const profile = await getProfileData(locals.user.id);
  return { profile, role: locals.user.role };
};