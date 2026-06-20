// src/routes/vc-dvc/reports/+page.server.ts
//
// The VC/DVC reports page surfaces a curated subset of the existing
// report registry — the same engines powering /admin/reports but
// filtered to governance-appropriate reports only.
import type { PageServerLoad } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { REPORT_REGISTRY } from '$lib/server/reports/registry.js';

// Reports the VC/DVC is permitted to see
const ALLOWED_REPORTS = new Set([
  'overview',
  'grade-distribution',
  'pass-fail',
  'exam-performance',
  'student-performance',
  'department-performance',
  'college-performance',
  'level-analysis',
  'session-semester',
  'violation-trends',
]);

export const load: PageServerLoad = async ({ locals }) => {
  requireVcDvc(locals.user);

  const reports = REPORT_REGISTRY
    .filter(r => ALLOWED_REPORTS.has(r.type))
    .map(r => ({ type: r.type, label: r.label, description: r.description ?? '' }));

  return { reports };
};
