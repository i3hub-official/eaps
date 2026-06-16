// src/routes/api/notifications/read-all/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireAuth } from '$lib/server/auth/guards.js';

const GetNotificationsSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
});

export const GET: RequestHandler = async ({ url, locals }) => {
  const user   = requireAuth(locals.user);
  const prisma = await getPrismaClient();

  const parsed = GetNotificationsSchema.safeParse({
    page:       url.searchParams.get('page')       ?? undefined,
    limit:      url.searchParams.get('limit')      ?? undefined,
    unreadOnly: url.searchParams.get('unreadOnly') ?? undefined,
  });

  if (!parsed.success) {
    throw error(400, 'Invalid query parameters');
  }

  const { page, limit, unreadOnly } = parsed.data;
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
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages:   Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      unreadCount,
    });
  } catch (e) {
    console.error('[notifications/get]', e);
    throw error(500, 'Failed to fetch notifications');
  }
};