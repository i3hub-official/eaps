// src/routes/(auth)/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { destroySession, clearSessionCookie, getSessionToken } from '$lib/server/auth/session.js';
import type { UserRole } from '@prisma/client';

const ROLE_HOME: Record<UserRole, string> = {
  student:      '/student',
  lecturer:     '/lecturer',
  invigilator:  '/invigilator',
  admin:        '/admin',
  hod:          '/hod',
  dean:         '/dean',
  exam_officer: '/exam-officer',
  vc_dvc:       '/vc-dvc',
};

function clearCookies(cookies: Parameters<Actions['default']>[0]['cookies']) {
  clearSessionCookie(cookies);
  cookies.delete('face_verified',         { path: '/' });
  cookies.delete('face_verified_at',      { path: '/' });
  cookies.delete('face_similarity_score', { path: '/' });
  cookies.delete('exam_session',          { path: '/' });
  cookies.delete('current_exam',          { path: '/' });
}

// GET — page renders so the user can confirm or cancel
export const load: PageServerLoad = async ({ locals }) => {
  const role = locals.user?.role;
  return {
    cancelHref: role ? (ROLE_HOME[role] ?? '/') : '/',
  };
};

// POST — user confirmed sign out
export const actions: Actions = {
  default: async ({ locals, cookies }) => {
    const role = locals.user?.role;
    const token = getSessionToken(cookies);
    if (token) await destroySession(token);
    clearCookies(cookies);
    redirect(302, `/login${role ? `?role=${role}` : ''}`);
  },
};