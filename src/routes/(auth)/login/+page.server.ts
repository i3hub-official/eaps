// src/routes/(auth)/login/+page.server.ts
// Staff portal login

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { StaffRole } from '@prisma/client';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
  verifyPassword,
  createStaffSession,
  invalidateAllStaffSessions,
  STAFF_COOKIE,
  cookieOptions,
} from '$lib/server/auth/index.js';
import { getStaffUser } from '$lib/server/auth/guards.js';

// ASSUMPTION: several granular StaffRole values share a landing page.
// Confirm this grouping matches your actual route folders.
function staffRoleHome(role: StaffRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'VC':
    case 'DVC':
    case 'REGISTRAR':
    case 'UNIVERSITY_EXAM_OFFICER':
    case 'UNIVERSITY_COURSE_COORDINATOR':
      return '/admin';
    case 'DEAN':
      return '/dean';
    case 'HOD':
    case 'COLLEGE_EXAM_OFFICER':
    case 'COLLEGE_COORDINATOR':
    case 'DEPARTMENT_EXAM_OFFICER':
    case 'DEPARTMENT_COORDINATOR':
      return '/hod';
    case 'LECTURER':
      return '/lecturer';
    case 'INVIGILATOR':
      return '/invigilator';
    default: {
      const _exhaustive: never = role;
      return '/';
    }
  }
}

export const load: PageServerLoad = async (event) => {
  const result = await getStaffUser(event);

  if (result) {
    if (result.staff.status === 'ACTIVE') {
      redirect(302, staffRoleHome(result.staff.primaryRole));
    }
    event.cookies.delete(STAFF_COOKIE, { path: '/' });
  }

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
    const staff = await prisma.staff.findUnique({ where: { email } });
    const INVALID = fail(401, { error: 'Invalid email or password' });
    if (!staff) return INVALID;

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
  },
};