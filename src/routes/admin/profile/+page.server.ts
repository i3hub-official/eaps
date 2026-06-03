// src/routes/admin/profile/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { hashPassword, verifyPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id },
    select: {
      id: true, fullName: true, email: true, phone: true,
      photoUrl: true, role: true, createdAt: true, updatedAt: true,
      staffId: true, collegeId: true, departmentId: true,
      college: { select: { name: true } },
      department: { select: { name: true } },
      _count: { select: { auditLogs: true } },
    },
  });

  // Recent audit logs for this admin
  const recentActivity = await prisma.auditLog.findMany({
    where: { userId: locals.user.id },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return { user, recentActivity };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) return fail(403);
    const fd = await request.formData();
    const fullName = String(fd.get('fullName') ?? '').trim();
    const phone    = String(fd.get('phone')    ?? '').trim() || null;

    if (!fullName) return fail(400, { field: 'profile', error: 'Full name is required.' });

    await prisma.user.update({
      where: { id: locals.user.id },
      data: { fullName, phone },
    });

    return { success: true, field: 'profile', message: 'Profile updated successfully.' };
  },

  changePassword: async ({ request, locals }) => {
    if (!locals.user) return fail(403);
    const fd = await request.formData();
    const current = String(fd.get('currentPassword') ?? '');
    const next    = String(fd.get('newPassword')     ?? '');
    const confirm = String(fd.get('confirmPassword') ?? '');

    if (next.length < 8)       return fail(400, { field: 'password', error: 'New password must be at least 8 characters.' });
    if (next !== confirm)       return fail(400, { field: 'password', error: 'Passwords do not match.' });

    const user = await prisma.user.findUnique({ where: { id: locals.user.id } });
    if (!user) return fail(404);

    const valid = await verifyPassword(current, user.passwordHash);
    if (!valid) return fail(400, { field: 'password', error: 'Current password is incorrect.' });

    const passwordHash = await hashPassword(next);
    await prisma.user.update({ where: { id: locals.user.id }, data: { passwordHash } });

    return { success: true, field: 'password', message: 'Password changed successfully.' };
  },
};