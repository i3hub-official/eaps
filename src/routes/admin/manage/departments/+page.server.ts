// src/routes/admin/manage/departments/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const [departments, colleges] = await Promise.all([
    prisma.department.findMany({
      include: {
        college: true,
        _count: { select: { courses: true } }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.college.findMany({ orderBy: { name: 'asc' } })
  ]);

  return { departments, colleges };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const collegeId = parseInt(data.get('collegeId') as string);
    const name = data.get('name') as string;
    const code = data.get('code') as string;

    if (!name?.trim()) return fail(400, { error: 'Department name is required' });
    if (!code?.trim()) return fail(400, { error: 'Department code is required' });
    if (isNaN(collegeId)) return fail(400, { error: 'College selection is required' });

    try {
      await prisma.department.create({
        data: {
          id: crypto.randomUUID(),
          collegeId,
          name: name.trim(),
          code: code.trim().toUpperCase()
        }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Department with this code already exists' });
      }
      return fail(500, { error: 'Failed to create department' });
    }
    return { success: true, message: 'Department created successfully' };
  },

  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = data.get('id') as string;
    const collegeId = parseInt(data.get('collegeId') as string);
    const name = data.get('name') as string;
    const code = data.get('code') as string;

    if (!name?.trim()) return fail(400, { error: 'Department name is required' });
    if (!code?.trim()) return fail(400, { error: 'Department code is required' });
    if (isNaN(collegeId)) return fail(400, { error: 'College selection is required' });

    try {
      await prisma.department.update({
        where: { id },
        data: { collegeId, name: name.trim(), code: code.trim().toUpperCase() }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Department with this code already exists' });
      }
      return fail(500, { error: 'Failed to update department' });
    }
    return { success: true, message: 'Department updated successfully' };
  },

  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = data.get('id') as string;

    try {
      await prisma.department.delete({ where: { id } });
    } catch {
      return fail(500, { error: 'Failed to delete department' });
    }
    return { success: true, message: 'Department deleted successfully' };
  }
};