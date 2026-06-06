// src/routes/api/notifications/read-all/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

/**
 * GET /api/notifications
 * Returns paginated notifications for the current user.
 * Query params: ?page=1&limit=20&unreadOnly=false
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = requireAuth(locals.user);

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
  const skip = (page - 1) * limit;

  try {
    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      unreadCount,
    });
  } catch (e) {
    console.error('[notifications/get]', e);
    throw error(500, 'Failed to fetch notifications');
  }
};