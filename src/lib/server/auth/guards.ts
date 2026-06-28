// src/lib/server/auth/guards.ts
//
// Role guards for all portals.
// Usage: const user = requireAdmin(locals.user)  — returns User or throws redirect/error
//        await requireAdminOrApiKey(ctx, 'read_users') — session OR API key
import { error, redirect } from '@sveltejs/kit';
import type { UserRole, User } from '@prisma/client';
import type { ApiScope } from '@prisma/client';
import { requireApiKey } from './api-key-guard.js';

// guards.ts — update MaybeUser
type MaybeUser = {
  id: string;
  role: UserRole;
  isActive: boolean;
  isSuspended: boolean;
  collegeId?: number | null;   // Int? in schema
  levelId?: number | null;     // Int? in schema
  departmentId?: string | null; // String (Uuid)? in schema
} | null | undefined;


function assertActive(user: MaybeUser, loginPath = '/login'): asserts user is NonNullable<MaybeUser> {
  if (!user) redirect(303, loginPath);
  if (!user.isActive || user.isSuspended) error(403, 'Account suspended or inactive.');
}

// ── Core auth ─────────────────────────────────────────────────────────────────

export function requireAuth(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  return user;
}

export function requireOwnership(user: NonNullable<MaybeUser>, ownerId: string): void {
  if (user.id !== ownerId && user.role !== 'admin') {
    error(403, 'You do not have permission to access this resource.');
  }
}

// ── Single-role guards ────────────────────────────────────────────────────────

export function requireAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'admin') error(403, 'Admin access required.');
  return user;
}

export function requireLecturer(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'lecturer' && user.role !== 'hod') error(403, 'Lecturer access required.');
  return user;
}

export function requireInvigilator(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'invigilator') error(403, 'Invigilator access required.');
  return user;
}

export function requireStudent(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'student') error(403, 'Student access required.');
  return user;
}

export function requireHod(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'hod') error(403, 'HOD access required.');
  return user;
}

export function requireDean(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'dean') error(403, 'Dean access required.');
  return user;
}

export function requireExamOfficer(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'exam_officer') error(403, 'Exam Officer access required.');
  return user;
}

export function requireVcDvc(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role !== 'vc_dvc') error(403, 'VC/DVC access required.');
  return user;
}

// ── Role + Admin combo guards ─────────────────────────────────────────────────

export function requireLecturerOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['lecturer', 'hod', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'Lecturer or Admin access required.');
  return user;
}

export function requireInvigilatorOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['invigilator', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'Invigilator or Admin access required.');
  return user;
}

export function requireStudentOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['student', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'Student or Admin access required.');
  return user;
}

export function requireHodOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['hod', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'HOD or Admin access required.');
  return user;
}

export function requireDeanOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['dean', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'Dean or Admin access required.');
  return user;
}

export function requireExamOfficerOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['exam_officer', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'Exam Officer or Admin access required.');
  return user;
}

export function requireVcDvcOrAdmin(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['vc_dvc', 'admin'];
  if (!allowed.includes(user.role)) error(403, 'VC/DVC or Admin access required.');
  return user;
}

// ── Multi-role guards (OR semantics) ─────────────────────────────────────────

/** Routes accessible by admin OR exam officer (e.g. exam schedule management). */
export function requireExamManagement(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['admin', 'exam_officer'];
  if (!allowed.includes(user.role)) error(403, 'Exam management access required.');
  return user;
}

/** Routes readable by governance accounts (VC/DVC, Dean, Exam Officer, Admin). */
export function requireReportAccess(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  const allowed: UserRole[] = ['admin', 'exam_officer', 'dean', 'vc_dvc'];
  if (!allowed.includes(user.role)) error(403, 'Report access required.');
  return user;
}

/**
 * Routes accessible by lecturers AND HODs who also lecture.
 * Pass the user's secondaryRoles (loaded from UserRoleAssignment) for HOD check.
 */
export function requireLecturerOrHod(
  user: MaybeUser,
  secondaryRoles: string[] = []
): NonNullable<MaybeUser> {
  assertActive(user);
  const isLecturer = user.role === 'lecturer';
  const isHodWhoLectures = user.role === 'hod' && secondaryRoles.includes('lecturer');
  if (!isLecturer && !isHodWhoLectures) error(403, 'Lecturer access required.');
  return user;
}

/** Any authenticated, active staff member (non-student). */
export function requireStaff(user: MaybeUser): NonNullable<MaybeUser> {
  assertActive(user);
  if (user.role === 'student') error(403, 'Staff access required.');
  return user;
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