// src/routes/admin/reports/[reportType]/+page.server.ts

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getReport } from '$lib/server/reports/registry.js';
import { ReportParamsSchema } from '$lib/server/reports/schemas.js';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  // ── 1. Auth guard ───────────────────────────────────────────────────────
  requireAdmin(locals.user);

  // ── 2. Resolve report metadata from registry ────────────────────────────
  const meta = getReport(params.reportType);
  if (!meta) {
    throw error(404, `Report "${params.reportType}" not found`);
  }

  // ── 3. Parse + validate URL params with Zod ───────────────────────────
  const parsed = ReportParamsSchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsed.success) {
    throw error(400, 'Invalid report parameters: ' + parsed.error.issues.map(i => i.message).join(', '));
  }

  // ── 4. Lazy-load the engine and fetch data ─────────────────────────────
  const startTime = performance.now();
  const { default: engine } = await meta.engine();
  const data = await engine.fetch(parsed.data);
  const loadTimeMs = Math.round(performance.now() - startTime);

  // ── 5. Strip non-serializable `engine` function before returning ──────
  const { engine: _, ...serializableMeta } = meta;

  return {
    meta: serializableMeta,
    params: parsed.data,
    data,
    summary: {
      generatedAt: new Date().toISOString(),
      loadTimeMs,
    },
  };
};
