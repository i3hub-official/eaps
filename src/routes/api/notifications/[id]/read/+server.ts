// src/routes/api/notifications/read-all/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

const ParamsSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

export const POST: RequestHandler = async ({ params, locals }) => {
  const user   = requireAuth(locals.user);
  const prisma = await getPrismaClient();

  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) throw error(400, 'Invalid notification ID');

  const { id } = parsed.data;

  try {
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id, isRead: false },
      data:  { isRead: true },
    });

    if (result.count === 0) {
      const exists = await prisma.notification.findUnique({
        where:  { id },
        select: { userId: true, isRead: true },
      });

      if (!exists)              throw error(404, 'Notification not found');
      if (exists.userId !== user.id) throw error(403, 'Not authorized');

      // Already read — still a success
      return json({ success: true, alreadyRead: true });
    }

    return json({ success: true });
  } catch (e) {
    if ((e as { status?: number }).status === 404 ||
        (e as { status?: number }).status === 403) throw e;
    console.error('[notifications/read]', e);
    throw error(500, 'Failed to mark notification as read');
  }
};