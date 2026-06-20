// src/routes/hod/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireHod(locals.user);
  return loadProfile(locals.user!.id);
};

export const actions: Actions = buildProfileActions();
