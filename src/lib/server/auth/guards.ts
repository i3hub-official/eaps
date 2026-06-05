// src/lib/server/auth/guards.ts
import { redirect, error } from '@sveltejs/kit';
import type { UserRole, User } from '@prisma/client';
import { requireApiKey } from './api-key-guard.js';
import type { ApiScope } from '@prisma/client';

const ROLE_HOME: Record<UserRole, string> = {
  student:     '/student',
  lecturer:    '/lecturer',
  invigilator: '/invigilator',
  admin:       '/admin',
};

export function requireAuth(user: User | null): User {
  if (!user) redirect(302, '/login');
  return user;
}

export function requireRole(user: User | null, ...roles: UserRole[]): User {
  const authed = requireAuth(user);
  if (!roles.includes(authed.role)) {
    redirect(302, ROLE_HOME[authed.role]);
  }
  return authed;
}

export function requireStudent(user: User | null):     User { return requireRole(user, 'student'); }
export function requireLecturer(user: User | null):    User { return requireRole(user, 'lecturer'); }
export function requireInvigilator(user: User | null): User { return requireRole(user, 'invigilator'); }
export function requireAdmin(user: User | null):       User { return requireRole(user, 'admin'); }

export function requireLecturerOrAdmin(user: User | null):    User { return requireRole(user, 'lecturer', 'admin'); }
export function requireInvigilatorOrAdmin(user: User | null): User { return requireRole(user, 'invigilator', 'admin'); }

export function requireOwnership(user: User, ownerId: string): void {
  if (user.id !== ownerId && user.role !== 'admin') {
    error(403, 'You do not have permission to access this resource');
  }
}

// ── Admin OR API Key ─────────────────────────────────────────────────────────

type AdminOrKeySuccess = { ok: true; user?: User; keyId?: string; scopes?: string[] };
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
  // 1. Try session-based admin auth first
  const user = ctx.locals.user;
  if (user?.role === 'admin') {
    return { ok: true, user };
  }

  // 2. Fall back to API key
  const auth = await requireApiKey(ctx.request, requiredScope, endpoint);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  return { ok: true, keyId: auth.keyId, scopes: auth.scopes };
}