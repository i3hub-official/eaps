// src/lib/server/auth/guards.ts
//
// Role guards for all portals.
// Usage: requireAdmin(locals.user)  — throws redirect(303) or error(403)
//        await requireAdminOrApiKey(ctx, 'read_users') — session OR API key
import { error, redirect } from '@sveltejs/kit';
import type { UserRole, User } from '@prisma/client';
import type { ApiScope } from '@prisma/client';
import { requireApiKey } from './api-key-guard.js';

type MaybeUser = { id: string; role: UserRole; isActive: boolean; isSuspended: boolean } | null | undefined;

function assertActive(user: MaybeUser, loginPath = '/login') {
  if (!user) redirect(303, loginPath);
  if (!user.isActive || user.isSuspended) error(403, 'Account suspended or inactive.');
}

// ── Core auth ─────────────────────────────────────────────────────────────────

export function requireAuth(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  return user!;
}

export function requireOwnership(user: NonNullable<MaybeUser>, ownerId: string): void {
  if (user.id !== ownerId && user.role !== 'admin') {
    error(403, 'You do not have permission to access this resource.');
  }
}

// ── Single-role guards ────────────────────────────────────────────────────────

export function requireAdmin(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'admin') error(403, 'Admin access required.');
}

export function requireLecturer(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'lecturer' && user!.role !== 'hod') {
    error(403, 'Lecturer access required.');
  }
}

export function requireInvigilator(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'invigilator') error(403, 'Invigilator access required.');
}

export function requireStudent(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'student') error(403, 'Student access required.');
}

export function requireHod(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'hod') error(403, 'HOD access required.');
}

export function requireDean(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'dean') error(403, 'Dean access required.');
}

export function requireExamOfficer(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'exam_officer') error(403, 'Exam Officer access required.');
}

export function requireVcDvc(user: MaybeUser) {
  assertActive(user);
  if (user!.role !== 'vc_dvc') error(403, 'VC/DVC access required.');
}

// ── Multi-role guards (OR semantics) ─────────────────────────────────────────

/** Routes accessible by admin OR exam officer (e.g. exam schedule management). */
export function requireExamManagement(user: MaybeUser) {
  assertActive(user);
  const allowed: UserRole[] = ['admin', 'exam_officer'];
  if (!allowed.includes(user!.role)) error(403, 'Exam management access required.');
}

/** Routes readable by governance accounts (VC/DVC, Dean, Exam Officer, Admin). */
export function requireReportAccess(user: MaybeUser) {
  assertActive(user);
  const allowed: UserRole[] = ['admin', 'exam_officer', 'dean', 'vc_dvc'];
  if (!allowed.includes(user!.role)) error(403, 'Report access required.');
}

/**
 * Routes accessible by lecturers AND HODs who also lecture.
 * Pass the user's secondaryRoles (loaded from UserRoleAssignment) for HOD check.
 */
export function requireLecturerOrHod(user: MaybeUser, secondaryRoles: string[] = []) {
  assertActive(user);
  const isLecturer = user!.role === 'lecturer';
  const isHodWhoLectures = user!.role === 'hod' && secondaryRoles.includes('lecturer');
  if (!isLecturer && !isHodWhoLectures) error(403, 'Lecturer access required.');
}

/** Any authenticated, active staff member (non-student). */
export function requireStaff(user: MaybeUser) {
  assertActive(user);
  if (user!.role === 'student') error(403, 'Staff access required.');
}

// ── Admin OR API Key ──────────────────────────────────────────────────────────

type AdminOrKeySuccess = { ok: true; user?: MaybeUser; keyId?: string; scopes?: string[] };
type AdminOrKeyFailure = { ok: false; response: Response };

/**
 * Allows either:
 *   1. An authenticated admin session (cookie-based), or
 *   2. A valid API key with the required scope.
 *
 * Usage in +server.ts:
 *   const auth = await requireAdminOrApiKey({ locals, request }, 'read_users');
 *   if (!auth.ok) return auth.response;
 */
export async function requireAdminOrApiKey(
  ctx: { locals: App.Locals; request: Request },
  requiredScope?: ApiScope,
  endpoint = '(unknown)'
): Promise<AdminOrKeySuccess | AdminOrKeyFailure> {
  const user = ctx.locals.user as MaybeUser;
  if (user?.role === 'admin' && user.isActive && !user.isSuspended) {
    return { ok: true, user };
  }

  const auth = await requireApiKey(ctx.request, requiredScope, endpoint);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  return { ok: true, keyId: auth.keyId, scopes: auth.scopes };
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** True if the user holds a given secondary role. */
export function hasSecondaryRole(secondaryRoles: string[], role: string): boolean {
  return secondaryRoles.includes(role);
}