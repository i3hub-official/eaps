// src/routes/admin/users/create/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);

  const [colleges, departments] = await prisma.$transaction([
    prisma.college.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, include: { college: { select: { name: true } } } }),
  ]);

  return { colleges, departments };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403);

    const fd = await request.formData();
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const fullName    = get('fullName');
    const email       = get('email').toLowerCase();
    const role        = get('role') as any;
    const password    = get('password');
    const phone       = get('phone') || null;
    const collegeId   = get('collegeId') ? Number(get('collegeId')) : null;
    const departmentId= get('departmentId') || null;
    const level       = get('level')  ? Number(get('level'))  : null;
    const session     = get('session') || null;
    const matricNumber= get('matricNumber') || null;
    const staffId     = get('staffId') || null;
    const jambRegNo   = get('jambRegNo') || null;

    if (!fullName || !email || !role || !password) {
      return fail(400, { error: 'Full name, email, role and password are required.' });
    }
    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail(400, { error: 'A user with this email already exists.' });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName, email, passwordHash, role, phone,
        collegeId, departmentId, level, session,
        matricNumber, staffId, jambRegNo,
        isActive: true,
      },
    });

    redirect(303, `/admin/users/${user.id}`);
  },
};