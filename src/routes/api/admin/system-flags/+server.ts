// src/routes/api/admin/system-flags/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StaffRole } from '@prisma/client';
import { getSystemFlags, setSystemFlag, clearFlagCache } from '$lib/server/system/flags.js';

/**
 * Check if user is SUPER_ADMIN
 */
function isSuperAdmin(roles: StaffRole[] | undefined): boolean {
  return (roles ?? []).includes('SUPER_ADMIN' as StaffRole);
}

/**
 * GET /api/admin/system-flags
 * Fetch current system flag values.
 * Requires: SUPER_ADMIN role only
 */
export const GET: RequestHandler = async ({ locals }) => {
  // Check auth and role
  if (!locals.user || locals.user.type !== 'staff') {
    return error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    return error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  try {
    const flags = await getSystemFlags();
    return json(flags);
  } catch (err) {
    console.error('[system-flags-api] GET error:', err);
    return error(500, 'Failed to fetch flags');
  }
};

/**
 * POST /api/admin/system-flags
 * Update a system flag value.
 * Body: { key: "maintenance" | "shutdown", value: boolean }
 * Requires: SUPER_ADMIN role only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  // Check auth and role
  if (!locals.user || locals.user.type !== 'staff') {
    return error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    return error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    // Validate input
    if (!key || !['maintenance', 'shutdown'].includes(key)) {
      return error(400, 'Invalid key: must be "maintenance" or "shutdown"');
    }

    if (typeof value !== 'boolean') {
      return error(400, 'Invalid value: must be boolean');
    }

    // Update flag
    await setSystemFlag(key, value, locals.user.id);

    // Return updated state
    const flags = await getSystemFlags();
    return json(flags);
  } catch (err) {
    console.error('[system-flags-api] POST error:', err);
    return error(500, 'Failed to update flag');
  }
};

/**
 * DELETE /api/admin/system-flags/cache
 * Clear the system flags cache (useful after manual DB updates).
 * Requires: SUPER_ADMIN role only
 */
export const DELETE: RequestHandler = async ({ locals, url }) => {
  // Check auth and role
  if (!locals.user || locals.user.type !== 'staff') {
    return error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    return error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  // Only allow cache clear for /api/admin/system-flags/cache
  if (!url.pathname.endsWith('/cache')) {
    return error(404, 'Not Found');
  }

  try {
    clearFlagCache();
    console.log('[system-flags-api] Cache cleared by', locals.user.id);
    return json({ success: true, message: 'Cache cleared' });
  } catch (err) {
    console.error('[system-flags-api] DELETE error:', err);
    return error(500, 'Failed to clear cache');
  }
};