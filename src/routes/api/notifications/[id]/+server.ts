// src/routes/api/notifications/delete/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification.
 * Returns 404 if notification doesn't exist or belongs to another user.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = requireAuth(locals.user);
            const prisma = await getPrismaClient();
  
  const { id } = params;

  if (!id) {
    throw error(400, 'Notification ID is required');
  }

  try {
    // Verify ownership and delete
    const notification = await prisma.notification.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (notification.count === 0) {
      // Check if it exists but belongs to another user
      const exists = await prisma.notification.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!exists) {
        throw error(404, 'Notification not found');
      }

      throw error(403, 'Not authorized');
    }

    return json({ success: true });
  } catch (e) {
    if (e.status === 404 || e.status === 403) throw e;
    console.error('[notifications/delete]', e);
    throw error(500, 'Failed to delete notification');
  }
};