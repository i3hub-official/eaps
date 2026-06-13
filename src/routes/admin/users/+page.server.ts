// src/routes/(admin)/users/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { createUser, deactivateUser, updateUser } from '$lib/server/db/users.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import type { UserRole } from '@prisma/client';

/** Protected owner accounts — these emails cannot be deleted or displayed.
 *  Patterns: ogwogp, gpbenj, ogwogpc (case-insensitive) */
const PROTECTED_PATTERNS = [
  /ogwogp/i,
  /gpbenj/i,
  /ogwogpc/i,
];

function isProtected(email: string): boolean {
  return PROTECTED_PATTERNS.some(p => p.test(email));
}

// ── Load ───────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);
          const prisma = await getPrismaClient();

  const role = (url.searchParams.get('role') ?? undefined) as UserRole | undefined;
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get('limit') ?? '20', 10)));

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { matricNumber: { contains: search, mode: 'insensitive' } },
      { staffId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [usersRaw, departments, colleges, courses, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        department: { include: { college: { select: { id: true, name: true, code: true } } } },
        _count: {
          select: {
            examSessions: true,
            courseRegistrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.department.findMany({
      include: { college: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.college.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.course.findMany({
      select: { id: true, code: true, title: true, creditUnits: true },
      orderBy: { code: 'asc' },
      take: 100,
    }),
    prisma.user.count({ where }),
  ]);

  // Strip protected accounts before sending to the client
  const safeUsers = usersRaw.filter(u => !isProtected(u.email));

  return {
    users: safeUsers,
    departments,
    colleges,
    courses,
    role: role ?? 'all',
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
      search,
    },
  };
};

// ── Actions ────────────────────────────────────────────────
export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d = await request.formData();

    const email        = String(d.get('email')        ?? '').trim().toLowerCase();
    const fullName     = String(d.get('full_name')     ?? '').trim();
    const role         = String(d.get('role')          ?? '') as UserRole;
    const password     = String(d.get('password')      ?? '');
    const departmentId = String(d.get('department_id') ?? '').trim() || undefined;
    const collegeId    = String(d.get('college_id')    ?? '').trim() || undefined;
    const staffId      = String(d.get('staff_id')      ?? '').trim() || undefined;
    const matricNumber = String(d.get('matric_number') ?? '').trim().toUpperCase() || undefined;
    const level        = d.get('level') ? Number(d.get('level')) : undefined;
    const phone        = String(d.get('phone')         ?? '').trim() || undefined;

    // Validation
    if (!email || !fullName || !role || !password) {
      return fail(400, { createError: 'All required fields must be filled.' });
    }

    if (password.length < 8) {
      return fail(400, { createError: 'Password must be at least 8 characters.' });
    }

    if (isProtected(email)) {
      return fail(403, { createError: 'Cannot create user with protected email pattern.' });
    }

    if (role === 'student' && matricNumber) {
      const matricPattern = /^[A-Z0-9]+\/[A-Z0-9]+\/\d{2,4}\/[A-Z0-9]+$/i;
      if (!matricPattern.test(matricNumber)) {
        return fail(400, {
          createError: 'Invalid matric number format. Expected: YEAR/DEPT/NUMBER (e.g. 2021/CSC/001)',
        });
      }
    }

    const passwordHash = await hashPassword(password);
    try {
      await createUser({
        email,
        fullName,
        passwordHash,
        role,
        departmentId,
        collegeId,
        staffId,
        matricNumber,
        level,
        phone,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return fail(400, { createError: 'Email or matric/staff ID already exists.' });
      }
      throw e;
    }

    return { created: true };
  },

  deactivate: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d  = await request.formData();
    const id = String(d.get('id') ?? '').trim();
    if (!id) return fail(400, { deactivateError: 'Missing user ID.' });

    const target = await prisma.user.findUnique({ where: { id }, select: { email: true, fullName: true } });
    if (!target) return fail(404, { deactivateError: 'User not found.' });

    if (isProtected(target.email)) {
      return fail(403, { deactivateError: 'Owner accounts cannot be deactivated.' });
    }

    await deactivateUser(id);
    return { deactivated: true, userName: target.fullName };
  },

  activate: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d  = await request.formData();
    const id = String(d.get('id') ?? '').trim();
    if (!id) return fail(400, { activateError: 'Missing user ID.' });

    const target = await prisma.user.findUnique({ where: { id }, select: { email: true, fullName: true } });
    if (!target) return fail(404, { activateError: 'User not found.' });

    if (isProtected(target.email)) {
      return fail(403, { activateError: 'Owner accounts cannot be modified.' });
    }

    await updateUser(id, { isActive: true });
    return { activated: true, userName: target.fullName };
  },

  update: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const d = await request.formData();

    const id           = String(d.get('id')           ?? '').trim();
    const fullName     = String(d.get('full_name')     ?? '').trim() || undefined;
    const email        = String(d.get('email')        ?? '').trim().toLowerCase() || undefined;
    const departmentId = String(d.get('department_id') ?? '').trim() || undefined;
    const collegeId    = String(d.get('college_id')    ?? '').trim() || undefined;
    const staffId      = String(d.get('staff_id')      ?? '').trim() || undefined;
    const matricNumber = String(d.get('matric_number') ?? '').trim().toUpperCase() || undefined;
    const level        = d.get('level') ? Number(d.get('level')) : undefined;
    const phone        = String(d.get('phone')         ?? '').trim() || undefined;

    if (!id) return fail(400, { updateError: 'Missing user ID.' });

    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) return fail(404, { updateError: 'User not found.' });

    if (isProtected(target.email)) {
      return fail(403, { updateError: 'Owner accounts cannot be modified.' });
    }

    try {
      await updateUser(id, {
        fullName,
        email,
        departmentId,
        collegeId,
        staffId,
        matricNumber,
        level,
        phone,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return fail(400, { updateError: 'Email or matric/staff ID already exists.' });
      }
      throw e;
    }

    return { updated: true };
  },
};