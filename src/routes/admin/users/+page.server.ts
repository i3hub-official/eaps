// src/routes/(admin)/users/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { listUsers, createUser, deactivateUser, updateUser } from '$lib/server/db/users.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { prisma } from '$lib/server/db/index.js';
import type { UserRole } from '@prisma/client';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);

  const role = (url.searchParams.get('role') ?? undefined) as UserRole | undefined;
  const [users, departments] = await Promise.all([
    listUsers(role),
    prisma.department.findMany({ include: { faculty: { select: { name: true } } }, orderBy: { name: 'asc' } }),
  ]);

  return { users, departments, role: role ?? 'all' };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d = await request.formData();

    const email        = String(d.get('email')         ?? '').trim().toLowerCase();
    const fullName     = String(d.get('full_name')      ?? '').trim();
    const role         = String(d.get('role')           ?? '') as UserRole;
    const password     = String(d.get('password')       ?? '');
    const departmentId = String(d.get('department_id')  ?? '').trim() || undefined;
    const staffId      = String(d.get('staff_id')       ?? '').trim() || undefined;
    const matricNumber = String(d.get('matric_number')  ?? '').trim().toUpperCase() || undefined;
    const level        = d.get('level') ? Number(d.get('level')) : undefined;

    if (!email || !fullName || !role || !password) {
      return fail(400, { createError: 'All required fields must be filled' });
    }

    const passwordHash = await hashPassword(password);
    try {
      await createUser({ email, fullName, passwordHash, role, departmentId, staffId, matricNumber, level });
    } catch (e: any) {
      if (e.code === 'P2002') return fail(400, { createError: 'Email or matric/staff ID already exists' });
      throw e;
    }

    return { created: true };
  },

  deactivate: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d = await request.formData();
    const id = String(d.get('id') ?? '');
    if (id) await deactivateUser(id);
    return { deactivated: true };
  },

  activate: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d = await request.formData();
    const id = String(d.get('id') ?? '');
    if (id) await updateUser(id, { isActive: true });
    return { activated: true };
  },
};