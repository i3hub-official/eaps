// src/routes/vc-dvc/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireVcDvc(locals.user);
  return loadProfile(user.id, 'vc_dvc');
};

export const actions: Actions = buildProfileActions(getUser);