// src/routes/api/admin/system-flags/cache/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StaffRole } from '@prisma/client';
import { clearFlagCache } from '$lib/server/system/flags.js';

function isSuperAdmin(roles: StaffRole[] | undefined): boolean {
  return (roles ?? []).includes('SUPER_ADMIN' as StaffRole);
}

export const DELETE: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.type !== 'staff') {
    throw error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    throw error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  try {
    clearFlagCache();
    // console.log('[system-flags-api] Cache cleared by', locals.user.id);
    return json({ success: true, message: 'Cache cleared' });
  } catch (err) {
    // console.error('[system-flags-api] cache DELETE error:', err);
    throw error(500, 'Failed to clear cache');
  }
};