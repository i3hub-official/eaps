// src/routes/admin/manage/courses/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

          const prisma = await getPrismaClient();


  const [courses, departments] = await Promise.all([
    prisma.course.findMany({
      include: {
        department: { include: { college: true } }
      },
      orderBy: { code: 'asc' }
    }),
    prisma.department.findMany({
      include: { college: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return { courses, departments };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
            const prisma = await getPrismaClient();

    const data = await request.formData();
    const departmentId = data.get('departmentId') as string;
    const code = (data.get('code') as string)?.trim().toUpperCase();
    const title = (data.get('title') as string)?.trim();
    const creditUnits = parseInt(data.get('creditUnits') as string);
    const level = data.get('level') ? parseInt(data.get('level') as string) : null;

    if (!departmentId) return fail(400, { error: 'Department selection is required' });
    if (!code) return fail(400, { error: 'Course code is required' });
    if (!title) return fail(400, { error: 'Course title is required' });
    if (isNaN(creditUnits) || creditUnits < 1) return fail(400, { error: 'Valid credit units are required' });

    try {
      await prisma.course.create({
        data: {
          id: crypto.randomUUID(),
          departmentId,
          code,
          title,
          creditUnits,
          level
        }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Course with this code already exists' });
      }
      return fail(500, { error: 'Failed to create course' });
    }
    return { success: true, message: 'Course created successfully' };
  },

  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
            const prisma = await getPrismaClient();

    const data = await request.formData();
    const id = data.get('id') as string;
    const departmentId = data.get('departmentId') as string;
    const code = (data.get('code') as string)?.trim().toUpperCase();
    const title = (data.get('title') as string)?.trim();
    const creditUnits = parseInt(data.get('creditUnits') as string);
    const level = data.get('level') ? parseInt(data.get('level') as string) : null;

    if (!departmentId) return fail(400, { error: 'Department selection is required' });
    if (!code) return fail(400, { error: 'Course code is required' });
    if (!title) return fail(400, { error: 'Course title is required' });
    if (isNaN(creditUnits) || creditUnits < 1) return fail(400, { error: 'Valid credit units are required' });

    try {
      await prisma.course.update({
        where: { id },
        data: { departmentId, code, title, creditUnits, level }
      });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return fail(400, { error: 'Course with this code already exists' });
      }
      return fail(500, { error: 'Failed to update course' });
    }
    return { success: true, message: 'Course updated successfully' };
  },

  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
            const prisma = await getPrismaClient();

    const data = await request.formData();
    const id = data.get('id') as string;

    try {
      await prisma.course.delete({ where: { id } });
    } catch {
      return fail(500, { error: 'Failed to delete course. It may have associated exams or registrations.' });
    }
    return { success: true, message: 'Course deleted successfully' };
  }
};