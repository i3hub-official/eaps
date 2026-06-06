// src/routes/api/notifications/read-all/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

/**
 * POST /api/notifications/read-all
 * Marks all unread notifications for the current user as read.
 */
export const POST: RequestHandler = async ({ locals }) => {
  const user = requireAuth(locals.user);

  try {
    const { count } = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return json({ success: true, marked: count });
  } catch (e) {
    console.error('[notifications/read-all]', e);
    throw error(500, 'Failed to mark notifications as read');
  }
};