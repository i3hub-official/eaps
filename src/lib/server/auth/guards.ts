import { redirect, error } from '@sveltejs/kit';
import type { UserRole, User } from '@prisma/client';

const ROLE_HOME: Record<UserRole, string> = {
  student:     '/dashboard',
  lecturer:    '/lecturer/dashboard',
  invigilator: '/invigilator/dashboard',
  admin:       '/admin/dashboard',
};

/**
 * Require an authenticated user — redirect to /login if not.
 * Returns the user so callers can use it directly.
 */
export function requireAuth(user: User | null): User {
  if (!user) redirect(302, '/login');
  return user;
}

/**
 * Require a specific role (or one of many roles).
 * Redirects to the user's own home if wrong role.
 * Returns the user typed as having the required role.
 */
export function requireRole(user: User | null, ...roles: UserRole[]): User {
  const authed = requireAuth(user);
  if (!roles.includes(authed.role)) {
    redirect(302, ROLE_HOME[authed.role]);
  }
  return authed;
}

/**
 * Require the user to be a student.
 */
export function requireStudent(user: User | null): User {
  return requireRole(user, 'student');
}

/**
 * Require the user to be a lecturer.
 */
export function requireLecturer(user: User | null): User {
  return requireRole(user, 'lecturer');
}

/**
 * Require the user to be an invigilator.
 */
export function requireInvigilator(user: User | null): User {
  return requireRole(user, 'invigilator');
}

/**
 * Require the user to be an admin.
 */
export function requireAdmin(user: User | null): User {
  return requireRole(user, 'admin');
}

/**
 * Require the user to be a lecturer or admin.
 */
export function requireLecturerOrAdmin(user: User | null): User {
  return requireRole(user, 'lecturer', 'admin');
}

/**
 * Require the user to be an invigilator or admin.
 */
export function requireInvigilatorOrAdmin(user: User | null): User {
  return requireRole(user, 'invigilator', 'admin');
}

/**
 * Throw a 403 if the user doesn't own the resource.
 * Use for ownership checks (e.g. lecturer editing their own exam).
 */
export function requireOwnership(user: User, ownerId: string): void {
  if (user.id !== ownerId && user.role !== 'admin') {
    error(403, 'You do not have permission to access this resource');
  }
}