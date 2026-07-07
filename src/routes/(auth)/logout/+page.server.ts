// src/routes/(auth)/logout/+page.server.ts
// Unified logout — clears whichever session (staff or student) is present.

import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  invalidateStaffSession,
  invalidateStudentSession,
  STAFF_COOKIE,
  STUDENT_COOKIE,
} from '$lib/server/auth/index.js';
import { getStaffUser, getStudentUser } from '$lib/server/auth/guards.js';
import { staffRoleHome } from '$lib/server/auth/roleHome.js';

export const load: PageServerLoad = async (event) => {
  const [staff, student] = await Promise.all([getStaffUser(event), getStudentUser(event)]);
  if (staff)   return { cancelHref: staffRoleHome(staff.staff.primaryRole) };
  if (student) return { cancelHref: '/student' };
  return { cancelHref: '/login' };
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    const staffToken = cookies.get(STAFF_COOKIE);
    if (staffToken) await invalidateStaffSession(staffToken);

    const studentToken = cookies.get(STUDENT_COOKIE);
    if (studentToken) await invalidateStudentSession(studentToken);

    cookies.delete(STAFF_COOKIE, { path: '/' });
    cookies.delete(STUDENT_COOKIE, { path: '/' });

    redirect(302, '/login');
  },
};