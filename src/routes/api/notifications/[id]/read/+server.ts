// src/routes/api/notifications/read-all/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

/**
 * POST /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if notification doesn't exist or belongs to another user.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
  const user = requireAuth(locals.user);
  const { id } = params;

  if (!id) {
    throw error(400, 'Notification ID is required');
  }

  try {
    // Verify ownership and update in one query
    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    if (notification.count === 0) {
      // Check if it exists but is already read or belongs to another user
      const exists = await prisma.notification.findUnique({
        where: { id },
        select: { userId: true, isRead: true },
      });

      if (!exists) {
        throw error(404, 'Notification not found');
      }

      if (exists.userId !== user.id) {
        throw error(403, 'Not authorized');
      }

      // Already read — still success
      return json({ success: true, alreadyRead: true });
    }

    return json({ success: true });
  } catch (e) {
    if (e.status === 404 || e.status === 403) throw e;
    console.error('[notifications/read]', e);
    throw error(500, 'Failed to mark notification as read');
  }
};