// src/routes/api/system-status/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSystemFlags } from '$lib/server/system/flags.js';

/**
 * GET /api/system-status
 * Public, unauthenticated endpoint returning current maintenance/shutdown state.
 * Used by MaintenanceScreen / ShutdownScreen to detect when to auto-recover.
 * Intentionally has NO auth guard — any user (including logged-out visitors)
 * stuck on these blocking screens needs to be able to poll this.
 * Returns ONLY these two booleans — never spread the full flags object here.
 */
export const GET: RequestHandler = async () => {
	const { maintenance, shutdown, launchSoon, launchDateISO } = await getSystemFlags();
	return json({ maintenance, shutdown, launchSoon, launchDateISO });
};