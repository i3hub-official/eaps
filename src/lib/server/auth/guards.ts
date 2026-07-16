// src/lib/server/auth/guards.ts
import { error, redirect } from '@sveltejs/kit'
import type { User, AuthenticatedStaff, AuthenticatedStudent } from './types'
import type { StaffRole } from '@prisma/client'
import { ADMIN_ROLES } from './roles'

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
  // Admin access = SUPER_ADMIN OR ADMIN — must stay in sync with ADMIN_ROLES.
  if (!(ADMIN_ROLES as readonly StaffRole[]).some((r) => hasRole(staff, r))) {
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