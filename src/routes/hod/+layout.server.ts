// src/routes/hod/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireHod } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  requireHod(locals.user);
  const prisma = await getPrismaClient();

  // Check if this HOD also holds a lecturer secondary role
  const secondaryRoles = await prisma.userRoleAssignment.findMany({
    where: { userId: locals.user!.id },
    select: { role: true },
  });

  const alsoLectures = secondaryRoles.some(r => r.role === 'lecturer');

  // Unread notification count for badge
  const unreadCount = await prisma.notification.count({
    where: { userId: locals.user!.id, isRead: false },
  });

  return {
    user: locals.user,
    alsoLectures,
    unreadCount,
  };
};