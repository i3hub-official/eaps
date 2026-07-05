// src/routes/exam-officer/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireExamOfficer(locals.user);
  return loadProfile(user.id, 'exam_officer');
};

export const actions: Actions = buildProfileActions(getUser);