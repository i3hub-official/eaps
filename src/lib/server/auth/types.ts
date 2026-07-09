// src/lib/server/auth/types.ts
//
// Shape of `event.locals.user` / `event.locals.session`, hydrated in
// hooks.server.ts from the session cookie on every request. Staff and
// Student are separate tables with different fields, so `User` is a
// discriminated union on `type` — narrow it with `user.type === 'student'`
// (or 'staff') before accessing type-specific fields.

export interface AuthenticatedStudent {
  type: 'student'
  id: string
  matricNumber: string
  email: string
  firstName: string
  otherNames: string
  lastName: string
  departmentId: string
  programmeId: string
  currentLevelId: string
  status: string
}

export interface AuthenticatedStaff {
  type: 'staff'
  id: string
  staffNumber: string
  email: string
  firstName: string
  lastName: string
  primaryRole: string
  collegeId: string | null
  departmentId: string | null
  status: string
  /** Flattened permission names from all active role assignments, e.g. "exam:create" */
  permissions: string[]
}

export type User = AuthenticatedStudent | AuthenticatedStaff

export interface Session {
  id: string
  token: string
  userType: 'staff' | 'student'
  expiresAt: Date
}