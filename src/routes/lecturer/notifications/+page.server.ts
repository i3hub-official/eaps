// src/routes/lecturer/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import {
  loadNotifications, markRead, markAllRead,
  deleteNotification, deleteAllNotifications,
} from '$lib/server/notifications-page.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'lecturer') redirect(303, '/login');
  return loadNotifications(locals.user.id);
};

export const actions: Actions = {
  markRead:   async ({ request, locals }) => markRead(request, locals.user!.id),
  markAllRead:async ({ locals })          => markAllRead(locals.user!.id),
  delete:     async ({ request, locals }) => deleteNotification(request, locals.user!.id),
  deleteAll:  async ({ locals })          => deleteAllNotifications(locals.user!.id),
};