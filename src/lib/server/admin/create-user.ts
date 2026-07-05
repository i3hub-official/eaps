// src/lib/server/admin/create-user.ts
//
// Shared helpers for admin user creation pages.
// Each role page calls `buildCreateUserData` then runs its own
// role-specific transaction on top.

import { fail } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';
import type { UserRole } from '@prisma/client';

export type CreateUserBase = {
  fullName: string;
  email: string;
  password: string;
  phone: string | null;
  staffId: string | null;
  role: UserRole;
  collegeId: number | null;
  departmentId: string | null;
};

/** Parse and validate the fields common to every role creation form. */
export function parseBaseFields(fd: FormData) {
  const get = (k: string) => String(fd.get(k) ?? '').trim();

  const fullName = get('fullName');
  const email    = get('email').toLowerCase();
  const password = get('password');
  const phone    = get('phone') || null;
  const staffId  = get('staffId') || null;
  const role     = get('role') as UserRole;

  if (!fullName || !email || !role || !password) {
    return { error: fail(400, { error: 'Full name, email, role and password are required.' }) };
  }
  if (password.length < 8) {
    return { error: fail(400, { error: 'Password must be at least 8 characters.' }) };
  }

  return { fullName, email, password, phone, staffId, role };
}

/** Resolve collegeId from departmentId if not supplied directly. */
export async function resolveCollegeId(
  departmentId: string | null,
  collegeIdRaw: string | null
): Promise<number | null> {
  if (collegeIdRaw) return Number(collegeIdRaw);
  if (!departmentId) return null;
  const prisma = await getPrismaClient();
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { collegeId: true },
  });
  return dept?.collegeId ?? null;
}

/** Check email uniqueness. Returns a fail() response if taken. */
export async function checkEmailUnique(email: string) {
  const prisma = await getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail(400, { error: 'A user with this email already exists.' });
  return null;
}

/**
 * Check phone uniqueness. `phone` has no @unique constraint on User, so
 * findFirst is used rather than findUnique (which would throw a Prisma
 * validation error on a non-unique field). Only call this if you actually
 * want to enforce unique phone numbers — currently no create action does.
 */
export async function checkPhoneUnique(phone: string) {
  const prisma = await getPrismaClient();
  const existing = await prisma.user.findFirst({ where: { phone } });
  if (existing) return fail(400, { error: 'A user with this phone number already exists.' });
  return null;
}

/** Block creation of accounts matching protected owner email patterns. */
const PROTECTED_PATTERNS = [/ogwogp/i, /gpbenj/i, /ogwogpc/i];

export function checkProtectedEmail(email: string) {
  if (PROTECTED_PATTERNS.some(p => p.test(email))) {
    return fail(403, { error: 'Cannot create a user with a protected email pattern.' });
  }
  return null;
}

/** Load the common dropdown data every create page needs. */
export async function loadCreatePageData() {
  const prisma = await getPrismaClient();
  const [colleges, departments, courses] = await prisma.$transaction([
    prisma.college.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { college: { select: { id: true, name: true, abbreviation: true } } },
    }),
    prisma.course.findMany({
      orderBy: [{ departmentId: 'asc' }, { code: 'asc' }],
      include: {
        department: { select: { id: true, name: true, code: true, collegeId: true } },
      },
    }),
  ]);
  return { colleges, departments, courses };
}