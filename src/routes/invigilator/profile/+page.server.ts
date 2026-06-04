// src/routes/invigilator/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import { loadProfile, updateProfile, changePassword } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireInvigilatorOrAdmin(locals.user);
  return loadProfile(locals.user.id);
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    await requireInvigilatorOrAdmin(locals.user);
    return updateProfile(request, locals.user.id);
  },
  changePassword: async ({ request, locals }) => {
    await requireInvigilatorOrAdmin(locals.user);
    return changePassword(request, locals.user.id);
  },
};