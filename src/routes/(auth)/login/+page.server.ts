// src/routes/(auth)/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { UserRole } from '@prisma/client';
import { findUserByEmail } from '$lib/server/db/users.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie, clearSessionCookie } from '$lib/server/auth/session.js';
import { getPrismaClient } from '$lib/server/db/index.js';

function roleHome(role: UserRole): string {
  switch (role) {
    case 'student':                return '/student';
    case 'lecturer':               return '/lecturer';
    case 'invigilator':            return '/invigilator';
    case 'admin':                  return '/admin';
    case 'hod':                    return '/hod';
    case 'dean':                   return '/dean';
    case 'exam_officer':           return '/exam-officer';
    case 'vc_dvc':                 return '/vc-dvc';
    case 'department_coordinator': return '/coordinator';
    // TypeScript will error here if a new role is added to the enum
    // but not handled — exhaustiveness check at compile time
    default: {
      const _exhaustive: never = role;
      return '/';
    }
  }
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  const user = locals.user;

  if (user) {
    if (user.isActive && !user.isSuspended) {
      redirect(302, roleHome(user.role as UserRole));
    }
    clearSessionCookie(cookies);
  }

  const roleHint = url.searchParams.get('role') ?? 'default';
  return { roleHint };
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

    const user    = await findUserByEmail(email);
    const INVALID = fail(401, { error: 'Invalid email or password' });
    if (!user) return INVALID;

    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, isSuspended: true, passwordHash: true, role: true },
    });

    if (!freshUser || !freshUser.isActive || freshUser.isSuspended) {
      return fail(403, { error: 'Your account is inactive or suspended.' });
    }

    const valid = await verifyPassword(password, freshUser.passwordHash);
    if (!valid) return INVALID;

    // Invalidate any existing sessions before creating a new one
    await prisma.authSession.deleteMany({ where: { userId: user.id } });

    const token = await createSession(
      user.id,
      getClientAddress(),
      request.headers.get('user-agent') ?? ''
    );
    setSessionCookie(cookies, token);

    redirect(302, roleHome(freshUser.role));
  },
};