// src/routes/vc-dvc/reports/[reportType]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { REPORT_REGISTRY } from '$lib/server/reports/registry.js';

const ALLOWED_REPORTS = new Set([
  'overview','grade-distribution','pass-fail','exam-performance',
  'student-performance','department-performance','college-performance',
  'level-analysis','session-semester','violation-trends',
]);

export const load: PageServerLoad = async ({ locals, params, url }) => {
  requireVcDvc(locals.user);

  const { reportType } = params;
  if (!ALLOWED_REPORTS.has(reportType)) error(403, 'This report is not available for your role.');

  const engine = REPORT_REGISTRY.find(r => r.type === reportType);
  if (!engine) error(404, 'Report not found.');

  const reportData = await engine.generate({ url, user: locals.user! });
  return { reportType, label: engine.label, reportData };
};
