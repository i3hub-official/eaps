// src/routes/api/admin/system-flags/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StaffRole } from '@prisma/client';
import { getSystemFlags, setSystemFlag, clearFlagCache } from '$lib/server/system/flags.js';

function isSuperAdmin(roles: StaffRole[] | undefined): boolean {
  return (roles ?? []).includes('SUPER_ADMIN' as StaffRole);
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.type !== 'staff') {
    throw error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    throw error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  try {
    const flags = await getSystemFlags();
    return json(flags);
  } catch (err) {
    console.error('[system-flags-api] GET error:', err);
    throw error(500, 'Failed to fetch flags');
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.user.type !== 'staff') {
    throw error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    throw error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || !['maintenance', 'shutdown'].includes(key)) {
      throw error(400, 'Invalid key: must be "maintenance" or "shutdown"');
    }

    if (typeof value !== 'boolean') {
      throw error(400, 'Invalid value: must be boolean');
    }

    await setSystemFlag(key, value, locals.user.id);

    const flags = await getSystemFlags();
    return json(flags);
  } catch (err) {
    // Re-throw SvelteKit HttpErrors (from our own `throw error(...)` above) as-is
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error('[system-flags-api] POST error:', err);
    throw error(500, 'Failed to update flag');
  }
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
  if (!locals.user || locals.user.type !== 'staff') {
    throw error(401, 'Unauthorized');
  }

  const roles = locals.user.roles ?? [];
  if (!isSuperAdmin(roles)) {
    throw error(403, 'Forbidden: SUPER_ADMIN role required');
  }

  if (!url.pathname.endsWith('/cache')) {
    throw error(404, 'Not Found');
  }

  try {
    clearFlagCache();
    console.log('[system-flags-api] Cache cleared by', locals.user.id);
    return json({ success: true, message: 'Cache cleared' });
  } catch (err) {
    console.error('[system-flags-api] DELETE error:', err);
    throw error(500, 'Failed to clear cache');
  }
};