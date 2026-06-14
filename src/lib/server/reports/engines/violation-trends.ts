// engines/violation-trends.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const ViolationTrendsEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const prisma     = await getPrismaClient();
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const violations = await prisma.violation.findMany({
      where:   { flaggedAt: { gte: eightDaysAgo } },
      select:  { flaggedAt: true, flagType: true },
      orderBy: { flaggedAt: 'asc' },
    });

    const dailyMap   = new Map<string, { count: number; types: Record<string, number> }>();
    const typeCounts: Record<string, number> = {};

    for (const v of violations) {
      const date = v.flaggedAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) dailyMap.set(date, { count: 0, types: {} });
      const day = dailyMap.get(date)!;
      day.count++;
      day.types[v.flagType] = (day.types[v.flagType] || 0) + 1;
      typeCounts[v.flagType] = (typeCounts[v.flagType] || 0) + 1;
    }

    return {
      dailyTrends: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, count: data.count, types: data.types }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      typeBreakdown: typeCounts,
    };
  },
};

export default ViolationTrendsEngine;