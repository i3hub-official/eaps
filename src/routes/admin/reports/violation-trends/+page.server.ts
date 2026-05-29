import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  const violations = await sql`
    SELECT "flaggedAt", "flagType" FROM "Violation" WHERE "flaggedAt" >= ${eightDaysAgo}
  `;

  const dailyMap = new Map<string, { count: number; types: Record<string, number> }>();
  const typeCounts: Record<string, number> = {};

  violations.forEach((v: any) => {
    const date = new Date(v.flaggedAt).toISOString().split('T')[0];
    if (!dailyMap.has(date)) dailyMap.set(date, { count: 0, types: {} });
    const day = dailyMap.get(date)!;
    day.count++;
    day.types[v.flagType] = (day.types[v.flagType] || 0) + 1;
    typeCounts[v.flagType] = (typeCounts[v.flagType] || 0) + 1;
  });

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    dailyTrends,
    typeBreakdown: typeCounts,
    totalViolations: violations.length,
  };
};
