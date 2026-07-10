// src/lib/server/auth/roleHome.ts
import type { StaffRole } from '@prisma/client';

/**
 * One-to-one mapping: every StaffRole gets its own distinct home route.
 * No role shares a dashboard with another — an Exam Officer's job is not
 * an HOD's job, a College Coordinator's job is not a Dean's job, etc.
 */
const ROLE_HOME: Record<StaffRole, string> = {
  SUPER_ADMIN: '/admin',
  VC: '/vc',
  DVC: '/dvc',
  REGISTRAR: '/registrar',
  UNIVERSITY_EXAM_OFFICER: '/ueo',
  UNIVERSITY_COURSE_COORDINATOR: '/cc',
  DEAN: '/dean',
  HOD: '/hod',
  COLLEGE_EXAM_OFFICER: '/ceo',
  COLLEGE_COORDINATOR: '/co',
  DEPARTMENT_EXAM_OFFICER: '/deo',
  DEPARTMENT_COORDINATOR: '/dc',
  LECTURER: '/lecturer',
  INVIGILATOR: '/invigilator',
};

export function staffRoleHome(role: StaffRole): string {
  return ROLE_HOME[role] ?? '/';
}

// Fails fast at module load if two roles ever collide on the same route —
// this class of bug is otherwise invisible to TypeScript and manifests as
// a silent infinite redirect loop (browser/SvelteKit surfaces it as a 500).
function assertUniqueRouteHomes(map: Record<StaffRole, string>): void {
  const seen = new Map<string, StaffRole>();
  for (const [role, path] of Object.entries(map) as [StaffRole, string][]) {
    const existing = seen.get(path);
    if (existing) {
      throw new Error(
        `[roleHome] Duplicate route "${path}" assigned to both "${existing}" and "${role}". ` +
        `Every StaffRole must map to a distinct route.`
      );
    }
    seen.set(path, role);
  }
}

assertUniqueRouteHomes(ROLE_HOME);