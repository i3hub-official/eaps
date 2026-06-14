// engines/course-enrollment.ts

import type { ReportEngine, ReportParams, ReportResult } from '../schemas.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const CourseEnrollmentEngine: ReportEngine = {
  async fetch(params: ReportParams): Promise<ReportResult> {
    const prisma = await getPrismaClient();
    const q = params.q ?? '';

    const courses = await prisma.course.findMany({
      where: q ? {
        OR: [
          { code:  { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      include: {
        department:    { select: { name: true } },
        registrations: { select: { id: true } },
      },
      orderBy: { code: 'asc' },
    });

    return {
      courses: courses.map(c => ({
        code:     c.code,
        title:    c.title,
        dept:     c.department?.name ?? '—',
        enrolled: c.registrations.length,
        capacity: 300,
        trend:    c.registrations.length > 200 ? 'up' : 'stable',
        semester: 1,
        session:  '2025/2026',
      })),
    };
  },
};

export default CourseEnrollmentEngine;