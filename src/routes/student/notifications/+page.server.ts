// src/routes/student/notifications/+page.server.ts

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadNotifications, buildNotificationActions } from '$lib/server/notifications-page.js';

const getUser = (locals: App.Locals) => locals.user ?? null;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  return loadNotifications(locals.user.id);
};

export const actions: Actions = buildNotificationActions(getUser);