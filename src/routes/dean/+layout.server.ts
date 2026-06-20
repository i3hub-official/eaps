// src/routes/dean/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  requireDean(locals.user);
  const prisma = await getPrismaClient();
  const unreadCount = await prisma.notification.count({
    where: { userId: locals.user!.id, isRead: false },
  });
  return { user: locals.user, unreadCount };
};