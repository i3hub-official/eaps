// src/routes/admin/users/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ locals, params }) => {
await requireAdmin(locals.user);
          const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      college: { select: { name: true } },
      department: { select: { name: true } },
      examSessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          exam: { select: { title: true, course: { select: { code: true } } } },
          examResult: { select: { percentage: true, grade: true, passed: true } },
        },
      },
      createdExams: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, course: { select: { code: true } } },
      },
      _count: {
        select: { examSessions: true, createdExams: true, auditLogs: true, notifications: true },
      },
    },
  });

  if (!user) error(404, 'User not found');

  const [colleges, departments] = await prisma.$transaction([
    prisma.college.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { college: { select: { name: true } } },
    }),
  ]);

  // Remove password hash from client
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, colleges, departments };
};

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    const fd = await request.formData();
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    await prisma.user.update({
      where: { id: params.id },
      data: {
        fullName:     get('fullName') || undefined,
        email:        get('email')?.toLowerCase() || undefined,
        phone:        get('phone') || null,
        collegeId:    get('collegeId') ? Number(get('collegeId')) : null,
        departmentId: get('departmentId') || null,
        level:        get('level') ? Number(get('level')) : null,
        session:      get('session') || null,
        matricNumber: get('matricNumber') || null,
        staffId:      get('staffId') || null,
      },
    });
    return { success: true, message: 'Profile updated.' };
  },

  resetPassword: async ({ request, locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    const fd = await request.formData();
    const newPassword = String(fd.get('newPassword') ?? '').trim();
    if (newPassword.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: params.id }, data: { passwordHash } });
    return { success: true, message: 'Password reset.' };
  },

  suspend: async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    await prisma.user.update({
      where: { id: params.id },
      data: { isSuspended: true, suspendedAt: new Date(), suspendedById: locals.user.id },
    });
    return { success: true };
  },

  unsuspend: async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    await prisma.user.update({
      where: { id: params.id },
      data: { isSuspended: false, suspendedAt: null, suspendedById: null },
    });
    return { success: true };
  },

  deactivate: async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
    return { success: true };
  },

  activate: async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    await prisma.user.update({ where: { id: params.id }, data: { isActive: true } });
    return { success: true };
  },

  delete: async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);
    if (locals.user.id === params.id) return fail(400, { error: 'Cannot delete your own account.' });
    await prisma.user.delete({ where: { id: params.id } });
    redirect(303, '/admin/users');
  },
};