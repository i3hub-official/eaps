import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { destroySession, clearSessionCookie, getSessionToken } from '$lib/server/auth/session.js';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = getSessionToken(cookies);
    if (token) await destroySession(token);
    clearSessionCookie(cookies);
    redirect(302, '/login');
  },
};