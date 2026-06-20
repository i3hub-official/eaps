// src/routes/dean/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { loadProfile, buildProfileActions } from '$lib/server/profile.js';
export const load: PageServerLoad = async ({ locals }) => { requireDean(locals.user); return loadProfile(locals.user!.id); };
export const actions: Actions = buildProfileActions();