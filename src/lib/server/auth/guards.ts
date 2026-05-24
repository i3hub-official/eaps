// src/lib/server/auth/guards.ts
import { redirect, error } from '@sveltejs/kit';
import type { UserRole, User } from '@prisma/client';

const ROLE_HOME: Record<UserRole, string> = {
  student:     '/dashboard',
  lecturer:    '/lecturer/dashboard',
  invigilator: '/invigilator/dashboard',
  admin:       '/admin/dashboard',
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