// src/lib/server/auth/guards.ts
// Role/permission guards that operate on the already-hydrated
// event.locals.user (populated once per request in hooks.server.ts).
//
// Usage:
//   const student = await requireStudent(locals.user)
//   const staff   = await requireStaff(locals.user)
//   const staff   = await requireExamOfficer(locals.user)
//   const staff   = await requirePermission(locals.user, 'exam:create')

import { error } from '@sveltejs/kit'
import type { User, AuthenticatedStaff, AuthenticatedStudent } from './types'
import type { StaffRole } from '@prisma/client'

// ─── Base checks ──────────────────────────────────────────────────────────

export async function requireStudent(user: User | null): Promise<AuthenticatedStudent> {
  if (!user || user.type !== 'student') {
    throw error(401, 'Not authenticated')
  }
  return user
}

export async function requireStaff(user: User | null): Promise<AuthenticatedStaff> {
  if (!user || user.type !== 'staff') {
    throw error(401, 'Not authenticated')
  }
  return user
}

// ─── Role-specific guards ─────────────────────────────────────────────────

function requireStaffRole(user: User | null, allowed: StaffRole[]): AuthenticatedStaff {
  if (!user || user.type !== 'staff') {
    throw error(401, 'Not authenticated')
  }
  if (!allowed.includes(user.primaryRole as StaffRole)) {
    throw error(403, 'Access denied')
  }
  return user
}

export async function requireAdmin(user: User | null) {
  return requireStaffRole(user, ['SUPER_ADMIN', 'REGISTRAR', 'UNIVERSITY_EXAM_OFFICER'])
}

export async function requireLecturer(user: User | null) {
  return requireStaffRole(user, [
    'LECTURER',
    'DEPARTMENT_EXAM_OFFICER',
    'DEPARTMENT_COORDINATOR',
    'HOD',
    'COLLEGE_EXAM_OFFICER',
    'UNIVERSITY_EXAM_OFFICER',
    'SUPER_ADMIN',
  ])
}

export async function requireInvigilator(user: User | null) {
  return requireStaffRole(user, [
    'INVIGILATOR',
    'LECTURER',
    'DEPARTMENT_EXAM_OFFICER',
    'HOD',
    'SUPER_ADMIN',
  ])
}

export async function requireExamOfficer(user: User | null) {
  return requireStaffRole(user, [
    'DEPARTMENT_EXAM_OFFICER',
    'COLLEGE_EXAM_OFFICER',
    'UNIVERSITY_EXAM_OFFICER',
    'SUPER_ADMIN',
  ])
}

// ─── Permission guards (fine-grained) ─────────────────────────────────────

export async function requirePermission(user: User | null, permission: string) {
  const staff = await requireStaff(user)
  if (!staff.permissions.includes(permission)) {
    throw error(403, `You don't have permission to: ${permission}`)
  }
  return staff
}

export async function requireAllPermissions(user: User | null, permissions: string[]) {
  const staff = await requireStaff(user)
  for (const p of permissions) {
    if (!staff.permissions.includes(p)) {
      throw error(403, `You don't have permission to: ${p}`)
    }
  }
  return staff
}

export async function requireAnyPermission(user: User | null, permissions: string[]) {
  const staff = await requireStaff(user)
  if (!permissions.some(p => staff.permissions.includes(p))) {
    throw error(403, 'Access denied')
  }
  return staff
}