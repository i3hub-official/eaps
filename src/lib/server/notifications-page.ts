// src/lib/server/notifications-page.ts

import { fail } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';

export async function loadNotifications(userId: string) {
  const prisma = await getPrismaClient();

  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id:        n.id,
      title:     n.title,
      message:   n.message,
      isRead:    n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markRead(request: Request, userId: string) {
  const prisma = await getPrismaClient();
  const fd = await request.formData();
  const id = String(fd.get('id') ?? '');
  if (!id) return fail(400, { message: 'Missing id' });
  await prisma.notification.update({ where: { id, userId }, data: { isRead: true } });
  return { success: true };
}

export async function markAllRead(userId: string) {
  const prisma = await getPrismaClient();
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { success: true };
}

export async function deleteNotification(request: Request, userId: string) {
  const prisma = await getPrismaClient();
  const fd = await request.formData();
  const id = String(fd.get('id') ?? '');
  if (!id) return fail(400, { message: 'Missing id' });
  await prisma.notification.delete({ where: { id, userId } });
  return { success: true };
}

export async function deleteAllNotifications(userId: string) {
  const prisma = await getPrismaClient();
  await prisma.notification.deleteMany({ where: { userId } });
  return { success: true };
}

// Single actions map — drop into any role's +page.server.ts
export function buildNotificationActions(getUser: (locals: App.Locals) => { id: string } | null) {
  return {
    mark_read: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return markRead(request, user.id);
    },
    mark_all_read: async ({ locals }: { locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return markAllRead(user.id);
    },
    delete: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return deleteNotification(request, user.id);
    },
    delete_all: async ({ locals }: { locals: App.Locals }) => {
      const user = getUser(locals);
      if (!user) return fail(401);
      return deleteAllNotifications(user.id);
    },
  };
}