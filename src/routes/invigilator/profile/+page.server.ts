// src/routes/invigilator/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireInvigilator } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireInvigilator(locals.user);
  return loadProfile(user.id, 'invigilator');
};

export const actions: Actions = buildProfileActions(getUser);