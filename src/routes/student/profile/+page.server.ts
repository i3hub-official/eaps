// src/routes/student/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);
  return loadProfile(user.id, 'student');
};

export const actions: Actions = buildProfileActions(getUser);