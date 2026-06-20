// src/routes/vc-dvc/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { loadNotifications, buildNotificationActions } from '$lib/server/notifications-page.js';
export const load: PageServerLoad = async ({ locals }) => { requireVcDvc(locals.user); return loadNotifications(locals.user!.id); };
export const actions: Actions = buildNotificationActions();
