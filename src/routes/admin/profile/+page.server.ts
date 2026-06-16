// src/routes/admin/profile/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  const role = 'admin';
  return loadProfile(locals.user.id, role);
};

export const actions: Actions = buildProfileActions(getUser);