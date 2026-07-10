// src/lib/server/auth/routeGuard.ts
import { redirect } from '@sveltejs/kit';
import type { StaffRole } from '@prisma/client';
import { staffRoleHome } from './roleHome.js';

/**
 * Restricts a route group to a single staff role. Wrong-role staff are
 * redirected to their own correct home rather than shown a bare 403 —
 * they're not doing anything malicious, they just hit the wrong door.
 */
export function requireStaffRole(locals: App.Locals, role: StaffRole) {
  const user = locals.user;

  if (!user || user.type !== 'staff') {
    throw redirect(303, '/login');
  }

  if (user.role !== role) {
    throw redirect(303, staffRoleHome(user.role));
  }

  return user;
}