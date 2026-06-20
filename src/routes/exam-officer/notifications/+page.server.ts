// src/routes/exam-officer/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { loadNotifications, buildNotificationActions } from '$lib/server/notifications-page.js';
export const load: PageServerLoad = async ({ locals }) => { requireExamOfficer(locals.user); return loadNotifications(locals.user!.id); };
export const actions: Actions = buildNotificationActions();
