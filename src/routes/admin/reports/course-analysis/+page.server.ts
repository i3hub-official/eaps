import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals.user);
          const prisma = await getPrismaClient();

  const searchQuery = url.searchParams.get('q') || '';

  const courses = await prisma.course.findMany({
    where: searchQuery
      ? {
          OR: [
            { code:  { contains: searchQuery, mode: 'insensitive' } },
            { title: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      department: { select: { name: true } },
      registrations: { select: { id: true } },
      exams: {
        select: {
          id: true,
          examResults: {
            select: { score: true, passed: true },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const formatted = courses.map(c => {
    const allResults = c.exams.flatMap(e => e.examResults);
    const totalResults = allResults.length;
    const passed = allResults.filter(r => r.passed).length;
    const scores = allResults
      .map(r => parseFloat(String(r.score ?? '0')))
      .filter(n => !isNaN(n));
    const avgScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      code:       c.code,
      title:      c.title,
      dept:       c.department?.name ?? '—',
      students:   c.registrations.length,
      exams:      c.exams.length,
      avgScore:   parseFloat(avgScore.toFixed(1)),
      passRate:   totalResults > 0
                    ? ((passed / totalResults) * 100).toFixed(1)
                    : '0',
      avgTime:    52,
      difficulty: avgScore >= 70 ? 'easy' : avgScore >= 50 ? 'medium' : 'hard',
      trend:      totalResults > 0 && passed / totalResults >= 0.7 ? 'up' : 'stable',
    };
  });

  return { courses: formatted };
};