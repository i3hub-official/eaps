// src/routes/lecturer/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { loadProfile, updateProfile, changePassword } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'lecturer') redirect(303, '/login');
  return loadProfile(locals.user.id);
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    return updateProfile(request, locals.user.id);
  },
  changePassword: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    return changePassword(request, locals.user.id);
  },
};