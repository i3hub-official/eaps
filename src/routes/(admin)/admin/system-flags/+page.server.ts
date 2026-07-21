// src/routes/admin/system-flags/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { StaffRole } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
  // Guard: require SUPER_ADMIN role only
  if (!locals.user || locals.user.type !== 'staff') {
    throw redirect(302, '/login');
  }

  const roles = locals.user.roles ?? [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN' as StaffRole);
  
  if (!isSuperAdmin) {
    throw error(403, 'Forbidden: SUPER_ADMIN access required');
  }

  // Page loaded successfully
  return {
    user: locals.user,
    pageTitle: 'System Flags Management',
    pageDescription: 'Control system-wide states like maintenance mode and shutdown.',
  };
};