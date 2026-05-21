// src/routes/(auth)/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByEmail, getUserPasswordHash } from '$lib/server/db/users.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    const destinations: Record<string, string> = {
      student: '/dashboard',
      lecturer: '/lecturer/dashboard',
      invigilator: '/invigilator/dashboard',
      admin: '/admin/dashboard',
    };
    redirect(302, destinations[locals.user.role] ?? '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return fail(401, { error: 'Invalid email or password' });
    }

    const hash = await getUserPasswordHash(email);
    if (!hash) {
      return fail(401, { error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, hash);
    if (!valid) {
      return fail(401, { error: 'Invalid email or password' });
    }

    const ip = getClientAddress();
    const ua = request.headers.get('user-agent') ?? '';
    const token = await createSession(user.id, ip, ua);
    setSessionCookie(cookies, token);

    const destinations: Record<string, string> = {
      student: '/dashboard',
      lecturer: '/lecturer/dashboard',
      invigilator: '/invigilator/dashboard',
      admin: '/admin/dashboard',
    };

    redirect(302, destinations[user.role] ?? '/');
  },
};
