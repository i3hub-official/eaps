// src/lib/server/auth/guards.ts
// Role/permission guards that operate on the already-hydrated
// event.locals.user (populated once per request in hooks.server.ts).
//
// Role checks look at `user.roles` — the full set of active
// StaffRoleAssignment names for this staff member — not `primaryRole`.
// A staff member can legitimately hold more than one role (e.g. an HOD
// who is also assigned as a LECTURER); primaryRole only affects routing
// (see routeGuard.ts / roleHome.ts), it is never a substitute for an
// actual role assignment.
//
// These guards are for capability checks *inside* a route or portal —
// e.g. a LECTURER-only action nested somewhere under a broader tree.
// To gate an entire route group by a staff member's primaryRole
// (redirecting wrong-role staff to their own home instead of a 403),
// use requireStaffRole from routeGuard.ts instead. Don't reach for
// these when what you actually want is routeGuard's primaryRole gate,
// and vice versa — they answer different questions and fail differently
// (403 error page here vs. redirect there).
//
// Usage:
//   const student = await requireStudent(locals.user)
//   const staff   = await requireStaff(locals.user)
//   const staff   = await requireLecturer(locals.user)
//   const staff   = await requirePermission(locals.user, 'exam:create')

import { error, redirect } from '@sveltejs/kit'
import type { User, AuthenticatedStaff, AuthenticatedStudent } from './types'
import type { StaffRole } from '@prisma/client'

// ─── Base checks ──────────────────────────────────────────────────────────

export async function requireStudent(user: User | null): Promise<AuthenticatedStudent> {
  if (!user || user.type !== 'student') {
    throw redirect(303, '/login')
  }
  return user
}

export async function requireStaff(user: User | null): Promise<AuthenticatedStaff> {
  if (!user || user.type !== 'staff') {
    throw redirect(303, '/login')
  }
  return user
}

// ─── Role-specific guards ─────────────────────────────────────────────────
// Each checks membership in the staff member's *actual* active role
// assignments (`user.roles`). No role is assumed to cover another —
// if someone needs both HOD and LECTURER access, they hold both role
// assignments, and each guard checks its own role independently.

function hasRole(user: AuthenticatedStaff, role: StaffRole): boolean {
  return user.roles.includes(role)
}

export async function requireAdmin(user: User | null): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  if (!hasRole(staff, 'SUPER_ADMIN')) {
    throw error(403, 'Access denied')
  }
  return staff
}

export async function requireLecturer(user: User | null): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  if (!hasRole(staff, 'LECTURER')) {
    throw error(403, 'Access denied')
  }
  return staff
}

export async function requireInvigilator(user: User | null): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  if (!hasRole(staff, 'INVIGILATOR')) {
    throw error(403, 'Access denied')
  }
  return staff
}

export async function requireExamOfficer(user: User | null): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  const officerRoles: StaffRole[] = [
    'DEPARTMENT_EXAM_OFFICER',
    'COLLEGE_EXAM_OFFICER',
    'UNIVERSITY_EXAM_OFFICER',
  ]
  if (!officerRoles.some(r => hasRole(staff, r))) {
    throw error(403, 'Access denied')
  }
  return staff
}

// ─── Permission guards (fine-grained) ─────────────────────────────────────

export async function requirePermission(user: User | null, permission: string): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  if (!staff.permissions.includes(permission)) {
    throw error(403, `You don't have permission to: ${permission}`)
  }
  return staff
}

export async function requireAllPermissions(user: User | null, permissions: string[]): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  for (const p of permissions) {
    if (!staff.permissions.includes(p)) {
      throw error(403, `You don't have permission to: ${p}`)
    }
  }
  return staff
}

export async function requireAnyPermission(user: User | null, permissions: string[]): Promise<AuthenticatedStaff> {
  const staff = await requireStaff(user)
  if (!permissions.some(p => staff.permissions.includes(p))) {
    throw error(403, 'Access denied')
  }
  return staff
}