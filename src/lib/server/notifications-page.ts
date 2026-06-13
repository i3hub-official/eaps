// src/lib/server/notifications-page.ts
// Shared load + action logic for lecturer & invigilator notifications pages.

import { fail } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';



export async function loadNotifications(userId: string) {
      const prisma = await getPrismaClient();

  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { notifications, unreadCount };
}

export async function markRead(request: Request, userId: string) {
      const prisma = await getPrismaClient();

  const fd = await request.formData();
  const id = String(fd.get('id') ?? '');
  if (!id) return fail(400);
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
  await prisma.notification.delete({ where: { id, userId } });
  return { success: true };
}

export async function deleteAllNotifications(userId: string) {
      const prisma = await getPrismaClient();

  await prisma.notification.deleteMany({ where: { userId } });
  return { success: true };
}