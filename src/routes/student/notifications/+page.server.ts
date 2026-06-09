// src/routes/student/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireStudent(locals.user);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return { notifications };
};

export const actions: Actions = {
  markRead: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const d    = await request.formData();
    const id   = String(d.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data:  { isRead: true },
    });
    return { ok: true };
  },

  markAllRead: async ({ locals }) => {
    const user = requireStudent(locals.user);
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data:  { isRead: true },
    });
    return { ok: true };
  },

  delete: async ({ request, locals }) => {
    const user = requireStudent(locals.user);
    const d    = await request.formData();
    const id   = String(d.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });

    await prisma.notification.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  },
};