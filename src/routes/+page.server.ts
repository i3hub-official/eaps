// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const ROLE_HOME: Record<string, string> = {
  student:     '/dashboard',
  lecturer:    '/lecturer/dashboard',
  invigilator: '/invigilator/dashboard',
  admin:       '/admin/dashboard',
};

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, ROLE_HOME[locals.user.role] ?? '/login');
  redirect(302, '/login');
};