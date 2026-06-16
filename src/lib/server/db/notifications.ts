// src/lib/server/db/notifications.ts
import { getPrismaClient } from './index.js';

export async function loadNotificationsForUser(userId: string) {
  const prisma = await getPrismaClient();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    100,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications: notifications.map((n: { id: string; title: string; message: string; isRead: boolean; createdAt: Date }) => ({
      id:        n.id,
      title:     n.title,
      message:   n.message,
      isRead:    n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}