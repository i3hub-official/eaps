// src/routes/(exam-officer)/exam-officer/+layout.server.ts
import { requireStaffRole } from '$lib/server/auth/routeGuard.js';
export const load = async ({ locals }) => ({ user: requireStaffRole(locals, 'DEPARTMENT_EXAM_OFFICER') });