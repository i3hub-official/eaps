// src/routes/lecturer/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  return loadProfile(user.id, 'lecturer');
};

export const actions: Actions = buildProfileActions(getUser);