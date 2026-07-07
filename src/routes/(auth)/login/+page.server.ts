// src/routes/(auth)/login/+page.server.ts
// Unified login for staff AND students — one form, one page.
// Tries the Staff table first, then Student. ASSUMPTION: staff and student
// email spaces don't overlap; if the same email exists in both tables,
// staff takes precedence.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
  verifyPassword,
  createStaffSession,
  createStudentSession,
  invalidateAllStaffSessions,
  STAFF_COOKIE,
  STUDENT_COOKIE,
  cookieOptions,
} from '$lib/server/auth/index.js';
import { getStaffUser, getStudentUser } from '$lib/server/auth/guards.js';
import { staffRoleHome } from '$lib/server/auth/roleHome.js';

export const load: PageServerLoad = async (event) => {
  const [staffResult, studentResult] = await Promise.all([
    getStaffUser(event),
    getStudentUser(event),
  ]);

  // getStaffUser/getStudentUser already gate on ACTIVE status internally —
  // a non-null result here means "log this person straight in."
  if (staffResult)   redirect(302, staffRoleHome(staffResult.staff.primaryRole));
  if (studentResult) redirect(302, '/student');

  // Clear any stale/expired cookies so the form starts clean
  if (event.cookies.get(STAFF_COOKIE))   event.cookies.delete(STAFF_COOKIE, { path: '/' });
  if (event.cookies.get(STUDENT_COOKIE)) event.cookies.delete(STUDENT_COOKIE, { path: '/' });

  const roleHint = event.url.searchParams.get('role') ?? 'default';
  return { roleHint };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, cookies, getClientAddress } = event;
    const data     = await request.formData();
    const email    = String(data.get('email')    ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    const prisma = await getPrismaClient();
    const INVALID = fail(401, { error: 'Invalid email or password' });

    // ── Try staff first ──────────────────────────────────────────────────
    const staff = await prisma.staff.findUnique({ where: { email } });
    if (staff) {
      if (staff.status !== 'ACTIVE') {
        return fail(403, { error: 'Your account is inactive or suspended.' });
      }
      const valid = await verifyPassword(password, staff.passwordHash);
      if (!valid) return INVALID;

      await invalidateAllStaffSessions(staff.id);
      const { token } = await createStaffSession(staff.id, {
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
      cookies.set(STAFF_COOKIE, token, cookieOptions);
      redirect(302, staffRoleHome(staff.primaryRole));
    }

    // ── Fall back to student ─────────────────────────────────────────────
    const student = await prisma.student.findUnique({ where: { email } });
    if (student) {
      if (student.status !== 'ACTIVE') {
        return fail(403, { error: 'Your account is inactive or suspended.' });
      }
      const valid = await verifyPassword(password, student.passwordHash);
      if (!valid) return INVALID;

      const { token } = await createStudentSession(student.id, {
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
      cookies.set(STUDENT_COOKIE, token, cookieOptions);
      redirect(302, '/student');
    }

    return INVALID;
  },
};