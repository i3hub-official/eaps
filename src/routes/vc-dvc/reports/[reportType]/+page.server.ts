// src/routes/vc-dvc/reports/[reportType]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { getReport } from '$lib/server/reports/registry.js';

const ALLOWED_REPORTS = new Set([
  'overview', 'grade-distribution', 'pass-fail', 'exam-performance',
  'student-performance', 'department-performance', 'college-performance',
  'level-analysis', 'session-semester', 'violation-trends',
]);

function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (typeof (value as any).toNumber === 'function') return (value as any).toNumber() as unknown as T;
  if (Array.isArray(value)) return value.map(serialize) as unknown as T;
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serialize(v)])
    ) as unknown as T;
  }
  return value;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
  requireVcDvc(locals.user);

  const { reportType } = params;
  if (!ALLOWED_REPORTS.has(reportType)) error(403, 'This report is not available for your role.');

  const meta = getReport(reportType);
  if (!meta) error(404, `Report "${reportType}" not found.`);

  const startTime = performance.now();
  const { default: engine } = await meta.engine();
  const data = await engine.fetch(Object.fromEntries(url.searchParams));
  const loadTimeMs = Math.round(performance.now() - startTime);

  const { engine: _, ...serializableMeta } = meta;

  return {
    meta: serializableMeta,
    params: Object.fromEntries(url.searchParams),
    data: serialize(data),
    summary: {
      generatedAt: new Date().toISOString(),
      loadTimeMs,
    },
  };
};