// src/routes/(auth)/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findUserByEmail } from '$lib/server/db/users.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie, clearSessionCookie } from '$lib/server/auth/session.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const ROLE_HOME: Record<string, string> = {
  student:      '/student',
  lecturer:     '/lecturer',
  invigilator:  '/invigilator',
  admin:        '/admin',
  hod:          '/hod',
  dean:         '/dean',
  exam_officer: '/exam-officer',
  vc_dvc:       '/vc-dvc',
};

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const user = locals.user;

  // Valid, active session → send them home
  if (user) {
    if (user.isActive && !user.isSuspended) {
      redirect(302, ROLE_HOME[user.role] ?? '/');
    }
    // Session exists but account is suspended/inactive → clear cookie and show login
    clearSessionCookie(cookies);
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const data     = await request.formData();
    const email    = String(data.get('email')    ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    const prisma = await getPrismaClient();

    const user = await findUserByEmail(email);
    const INVALID = fail(401, { error: 'Invalid email or password' });
    if (!user) return INVALID;

    // Re-verify account state from DB (not from stale locals)
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, isSuspended: true, passwordHash: true, role: true },
    });

    if (!freshUser || !freshUser.isActive || freshUser.isSuspended) {
      return fail(403, { error: 'Your account is inactive or suspended.' });
    }

    const valid = await verifyPassword(password, freshUser.passwordHash);
    if (!valid) return INVALID;

    // Invalidate any existing sessions for this user before creating a new one
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const token = await createSession(
      user.id,
      getClientAddress(),
      request.headers.get('user-agent') ?? ''
    );
    setSessionCookie(cookies, token);
    redirect(302, ROLE_HOME[freshUser.role] ?? '/');
  },
};