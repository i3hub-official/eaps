// src/routes/vc-dvc/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireVcDvc } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireVcDvc(locals.user);
  const prisma  = await getPrismaClient();
  const session = url.searchParams.get('session') || '';
  const passed  = url.searchParams.get('passed') || '';
  const page    = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take    = 30;

  const where: any = {
    ...(session ? { exam: { session } } : {}),
    ...(passed === 'true'  ? { passed: true }  : {}),
    ...(passed === 'false' ? { passed: false } : {}),
  };

  const [results, total, sessions] = await Promise.all([
    prisma.examResult.findMany({
      where, orderBy: { generatedAt: 'desc' }, skip: (page - 1) * take, take,
      select: {
        id: true, percentage: true, passed: true, grade: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: {
          select: {
            title: true, session: true,
            course: { select: { code: true, department: { select: { college: { select: { abbreviation: true } } } } } },
          },
        },
      },
    }),
    prisma.examResult.count({ where }),
    prisma.exam.findMany({ distinct: ['session'], select: { session: true }, orderBy: { session: 'desc' } }),
  ]);

  return {
    total, page, take, session, passed,
    sessions: sessions.map(s => s.session),
    results: results.map(r => ({
      ...r,
      percentage: r.percentage !== null ? Number(r.percentage) : null,
    })),
  };
};