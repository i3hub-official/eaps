// src/routes/(auth)/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSessionToken, deleteSession, clearSessionCookie } from '$lib/server/auth/session.js';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = getSessionToken(cookies);
  if (token) {
    await deleteSession(token);
    clearSessionCookie(cookies);
  }
  redirect(302, '/login');
};
