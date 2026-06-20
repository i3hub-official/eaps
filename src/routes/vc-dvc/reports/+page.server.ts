// src/routes/vc-dvc/reports/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { getAllReports } from '$lib/server/reports/registry.js';

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

  const reports = getAllReports()
    .filter(r => ALLOWED_REPORTS.has(r.id))
    .map(r => ({ type: r.id, label: r.label, description: r.description ?? '' }));

  return { reports };
};