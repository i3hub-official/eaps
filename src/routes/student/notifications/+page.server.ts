// src/routes/student/notifications/+page.server.ts

import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { loadNotifications, buildNotificationActions } from '$lib/server/notifications-page.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  await requireStudent(locals.user);
  return loadNotifications(locals.user.id);
};

export const actions: Actions = buildNotificationActions(getUser);