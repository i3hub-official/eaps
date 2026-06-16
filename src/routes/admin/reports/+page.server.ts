// src/routes/admin/reports/+page.server.ts
 
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getAllReports } from '$lib/server/reports/registry.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const reports = getAllReports().map(r => ({
    id:                r.id,
    label:             r.label,
    description:       r.description,
    supportsSearch:    r.supportsSearch,
    supportsDateRange: r.supportsDateRange,
    exportable:        r.exportable,
  }));

  return { reports };
};