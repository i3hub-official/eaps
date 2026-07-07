// src/routes/(auth)/logout/+page.server.ts
// Staff portal logout

import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { invalidateStaffSession, STAFF_COOKIE } from '$lib/server/auth/index.js';
import { getStaffUser } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async (event) => {
  const result = await getStaffUser(event);
  return { cancelHref: result ? '/' : '/login' };
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get(STAFF_COOKIE);
    if (token) await invalidateStaffSession(token);
    cookies.delete(STAFF_COOKIE, { path: '/' });
    redirect(302, '/login');
  },
};