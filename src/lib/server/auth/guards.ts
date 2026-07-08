// src/lib/server/auth/guards.ts
// Route-level auth guards for all portals
//
// Usage in +page.server.ts:
//   const { student } = await requireStudent(event)
//   const { staff }   = await requireStaff(event)
//   const { staff }   = await requirePermission(event, 'exam:create')

import { redirect, error } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import {
  getStaffByToken,
  getStudentByToken,
  STAFF_COOKIE,
  STUDENT_COOKIE,
} from '../../components/index'
import type { StaffRole } from '@prisma/client'

// ─── Student guard ───────────────────────────────────────────────────────────

export async function requireStudent(event: RequestEvent) {
  const token = event.cookies.get(STUDENT_COOKIE)
  if (!token) throw redirect(303, '/student/login')

  const result = await getStudentByToken(token)
  if (!result) {
    event.cookies.delete(STUDENT_COOKIE, { path: '/' })
    throw redirect(303, '/student/login')
  }

  return result // { student, session }
}

// ─── Staff guard (any authenticated staff) ───────────────────────────────────

export async function requireStaff(event: RequestEvent) {
  const token = event.cookies.get(STAFF_COOKIE)
  if (!token) throw redirect(303, '/login')

  const result = await getStaffByToken(token)
  if (!result) {
    event.cookies.delete(STAFF_COOKIE, { path: '/' })
    throw redirect(303, '/login')
  }

  // Convert permissions to Set if not already
  const permissions = result.permissions instanceof Set 
    ? result.permissions 
    : new Set(result.permissions || [])

  return { 
    staff: result.staff, 
    session: result.session, 
    permissions 
  }
}

// ─── Role-specific guards ────────────────────────────────────────────────────

export async function requireAdmin(event: RequestEvent) {
  const result = await requireStaff(event)
  const adminRoles: StaffRole[] = ['SUPER_ADMIN', 'REGISTRAR', 'UNIVERSITY_EXAM_OFFICER']
  if (!adminRoles.includes(result.staff.primaryRole)) {
    throw error(403, 'Access denied')
  }
  return result
}

export async function requireLecturer(event: RequestEvent) {
  const result = await requireStaff(event)
  const lecturerRoles: StaffRole[] = [
    'LECTURER',
    'DEPARTMENT_EXAM_OFFICER',
    'DEPARTMENT_COORDINATOR',
    'HOD',
    'COLLEGE_EXAM_OFFICER',
    'UNIVERSITY_EXAM_OFFICER',
    'SUPER_ADMIN',
  ]
  if (!lecturerRoles.includes(result.staff.primaryRole)) {
    throw error(403, 'Access denied')
  }
  return result
}

export async function requireInvigilator(event: RequestEvent) {
  const result = await requireStaff(event)
  const invigilatorRoles: StaffRole[] = [
    'INVIGILATOR',
    'LECTURER',
    'DEPARTMENT_EXAM_OFFICER',
    'HOD',
    'SUPER_ADMIN',
  ]
  if (!invigilatorRoles.includes(result.staff.primaryRole)) {
    throw error(403, 'Access denied')
  }
  return result
}

// ─── Permission guard ────────────────────────────────────────────────────────
// Fine-grained check — use this when role alone isn't enough

export async function requirePermission(event: RequestEvent, permission: string) {
  const result = await requireStaff(event)
  if (!result.permissions.has(permission)) {
    throw error(403, `You don't have permission to: ${permission}`)
  }
  return result
}

// Multiple permissions (AND — all required)
export async function requireAllPermissions(event: RequestEvent, permissions: string[]) {
  const result = await requireStaff(event)
  for (const p of permissions) {
    if (!result.permissions.has(p)) {
      throw error(403, `You don't have permission to: ${p}`)
    }
  }
  return result
}

// Multiple permissions (OR — any one is enough)
export async function requireAnyPermission(event: RequestEvent, permissions: string[]) {
  const result = await requireStaff(event)
  if (!permissions.some(p => result.permissions.has(p))) {
    throw error(403, 'Access denied')
  }
  return result
}

// ─── Helpers for layouts (don't throw — return null if not logged in) ────────

export async function getStaffUser(event: RequestEvent) {
  const token = event.cookies.get(STAFF_COOKIE)
  if (!token) return null
  return getStaffByToken(token)
}

export async function getStudentUser(event: RequestEvent) {
  const token = event.cookies.get(STUDENT_COOKIE)
  if (!token) return null
  return getStudentByToken(token)
}