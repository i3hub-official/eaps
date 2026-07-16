// src/lib/server/auth/roles.ts

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Accepts either:
 *  - a single role string (e.g. staff.primaryRole from a fresh DB row), or
 *  - an array of role strings (e.g. locals.user.roles — the full set of
 *    active StaffRoleAssignments on an authenticated session).
 *
 * Never substitute one for the other: primaryRole is for routing only,
 * `.roles` is the actual authorization source. See guards.ts header comment.
 */
export function isAdminRole(
    roles: readonly string[] | string | undefined | null
): boolean {
    if (!roles) return false;
    const list = Array.isArray(roles) ? roles : [roles];
    return list.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}