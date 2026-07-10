// src/routes/(lecturer)/lecturer/+layout.server.ts
import { requireStaffRole } from '$lib/server/auth/routeGuard.js';
export const load = async ({ locals }) => ({ user: requireStaffRole(locals, 'LECTURER') });