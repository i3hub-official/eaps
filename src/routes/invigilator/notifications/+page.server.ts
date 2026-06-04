// src/routes/invigilator/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireInvigilatorOrAdmin } from '$lib/server/auth/guards.js';
import {
  loadNotifications, markRead, markAllRead,
  deleteNotification, deleteAllNotifications,
} from '$lib/server/notifications-page.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireInvigilatorOrAdmin(locals.user);
  return loadNotifications(user.id);
};

export const actions: Actions = {
  markRead:    async ({ request, locals }) => markRead(request, locals.user!.id),
  markAllRead: async ({ locals })          => markAllRead(locals.user!.id),
  delete:      async ({ request, locals }) => deleteNotification(request, locals.user!.id),
  deleteAll:   async ({ locals })          => deleteAllNotifications(locals.user!.id),
};