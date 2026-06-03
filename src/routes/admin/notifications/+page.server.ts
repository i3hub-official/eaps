// src/routes/admin/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';


export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);


  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: locals.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: locals.user.id, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
};

export const actions: Actions = {
  markRead: async ({ request, locals }) => {
    if (!locals.user) return fail(403);
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    if (!id) return fail(400);
    await db.notification.update({
      where: { id, userId: locals.user.id },
      data: { isRead: true },
    });
    return { success: true };
  },

  markAllRead: async ({ locals }) => {
    if (!locals.user) return fail(403);
    await prisma.notification.updateMany({
      where: { userId: locals.user.id, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(403);
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    await prisma.notification.delete({ where: { id, userId: locals.user.id } });
    return { success: true };
  },

  deleteAll: async ({ locals }) => {
    if (!locals.user) return fail(403);
    await prisma.notification.deleteMany({ where: { userId: locals.user.id } });
    return { success: true };
  },

  // Admin sending a notification to a user
  send: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    const fd = await request.formData();
    const userId  = String(fd.get('userId')  ?? '').trim();
    const title   = String(fd.get('title')   ?? '').trim();
    const message = String(fd.get('message') ?? '').trim();

    if (!userId || !title || !message) return fail(400, { error: 'All fields required.' });

    // Validate user exists
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return fail(404, { error: 'User not found.' });

    await prisma.notification.create({ data: { userId, title, message } });
    return { success: true, message: 'Notification sent.' };
  },
};