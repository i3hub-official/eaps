// lib/server/reports/engines/grade-distribution.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const GradeDistributionEngine: ReportEngine = {
  async fetch(_params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();

    const results = await prisma.examResult.findMany({
      select: { score: true },
    });

    const grades: Record<string, { count: number; percentage: number; range: string }> = {
      A: { count: 0, percentage: 0, range: '70–100%' },
      B: { count: 0, percentage: 0, range: '60–69%'  },
      C: { count: 0, percentage: 0, range: '50–59%'  },
      D: { count: 0, percentage: 0, range: '45–49%'  },
      E: { count: 0, percentage: 0, range: '40–44%'  },
      F: { count: 0, percentage: 0, range: '0–39%'   },
    };

    for (const r of results) {
      const score = parseFloat(String(r.score ?? '0')) || 0;
      const grade =
        score >= 70 ? 'A' :
        score >= 60 ? 'B' :
        score >= 50 ? 'C' :
        score >= 45 ? 'D' :
        score >= 40 ? 'E' : 'F';
      grades[grade].count++;
    }

    const total = results.length;
    for (const g of Object.keys(grades)) {
      grades[g].percentage = total > 0
        ? parseFloat(((grades[g].count / total) * 100).toFixed(1))
        : 0;
    }

    return { gradeData: grades, totalStudents: total };
  },
};

export default GradeDistributionEngine;