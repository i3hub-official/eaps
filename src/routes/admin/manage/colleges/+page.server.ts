// src/routes/admin/manage/colleges/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const colleges = await prisma.college.findMany({
    include: {
      _count: { select: { departments: true } }
    },
    orderBy: { name: 'asc' }
  });

  return { colleges };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const name = data.get('name') as string;
    const code = data.get('code') as string || null;
    const abbreviation = data.get('abbreviation') as string || null;

    if (!name?.trim()) {
      return fail(400, { error: 'College name is required' });
    }

    try {
      await prisma.college.create({
        data: { name: name.trim(), code, abbreviation }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'College with this name or code already exists' });
      }
      return fail(500, { error: 'Failed to create college' });
    }
    return { success: true, message: 'College created successfully' };
  },

  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    const name = data.get('name') as string;
    const code = data.get('code') as string || null;
    const abbreviation = data.get('abbreviation') as string || null;

    if (!name?.trim()) {
      return fail(400, { error: 'College name is required' });
    }

    try {
      await prisma.college.update({
        where: { id },
        data: { name: name.trim(), code, abbreviation }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'College with this name or code already exists' });
      }
      return fail(500, { error: 'Failed to update college' });
    }
    return { success: true, message: 'College updated successfully' };
  },

  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);

    try {
      await prisma.college.delete({ where: { id } });
    } catch {
      return fail(500, { error: 'Failed to delete college. It may have associated departments.' });
    }
    return { success: true, message: 'College deleted successfully' };
  }
};