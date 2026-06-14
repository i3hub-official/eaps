// routes/admin/reports/[reportType]/+page.server.ts

import type { PageServerLoad } from './$types';
import { error }         from '@sveltejs/kit';
import { requireAdmin }  from '$lib/server/auth/guards.js';
import { getReport }     from '$lib/server/reports/registry.js';
import { ReportParamsSchema } from '$lib/server/reports/schemas.js';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  requireAdmin(locals.user);

  // 1. Resolve the report from the registry
  const meta = getReport(params.reportType);
  if (!meta) throw error(404, `Report "${params.reportType}" not found`);

  // 2. Parse + validate URL params with Zod
  const parsed = ReportParamsSchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsed.success) throw error(400, 'Invalid report parameters');

  // 3. Lazy-load the engine and fetch data
  const { default: engine } = await meta.engine();
  const data = await engine.fetch(parsed.data);

  // 4. Strip non-serializable `engine` function before returning
  const { engine: _, ...serializableMeta } = meta;

  return {
    meta: serializableMeta,   // label, description, supportsSearch, etc.
    params: parsed.data,
    data,                     // the actual report payload
  };
};