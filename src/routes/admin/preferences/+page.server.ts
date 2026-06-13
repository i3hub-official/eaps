// src/routes/admin/preferences/+page.server.ts

import type { PageServerLoad, Actions } from './$types';
import type { Prisma } from '@prisma/client';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';


export const load: PageServerLoad = async ({ locals }) => {
await requireAdmin(locals.user);
        const prisma = await getPrismaClient();


   const row = await prisma.userPreference.findUnique({ where: { userId: locals.user.id } });
  const prefs = (row?.prefs as Record<string, unknown>) ?? {};

  return {
    userId: locals.user.id,
    prefs,
  };
};

export const actions: Actions = {
  
  save: async ({ request, locals }) => {
            const prisma = await getPrismaClient();

    if (!locals.user) return fail(403);

    const fd = await request.formData();
    const raw = String(fd.get('prefs') ?? '{}');

    let prefs: Prisma.InputJsonValue;
    try { prefs = JSON.parse(raw) as Prisma.InputJsonValue; }
    catch { return fail(400, { error: 'Invalid preferences format.' }); }

    await prisma.userPreference.upsert({
      where: { userId: locals.user.id },
     create: { userId: locals.user.id, prefs },
     update: { prefs },
 });

    return { success: true };
  },
};