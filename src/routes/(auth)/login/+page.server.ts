// src/routes/(auth)/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findUserByEmail } from '$lib/server/db/users.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';

const ROLE_HOME: Record<string, string> = {
  student:     '/student',
  lecturer:    '/lecturer',
  invigilator: '/invigilator',
  admin:       '/admin',
};

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, ROLE_HOME[locals.user.role] ?? '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const data  = await request.formData();
    const email    = String(data.get('email')    ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    const INVALID = fail(401, { error: 'Invalid email or password' });
    if (!user || !user.isActive) return INVALID;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return INVALID;

    const token = await createSession(
      user.id,
      getClientAddress(),
      request.headers.get('user-agent') ?? ''
    );
    setSessionCookie(cookies, token);
    redirect(302, ROLE_HOME[user.role] ?? '/');
  },
};