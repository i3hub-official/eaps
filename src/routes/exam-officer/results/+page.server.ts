// src/routes/exam-officer/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireExamOfficer(locals.user);
  const prisma  = await getPrismaClient();
  const search  = url.searchParams.get('q') || '';
  const session = url.searchParams.get('session') || '';
  const passed  = url.searchParams.get('passed') || '';
  const page    = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take    = 30;

  const where: any = {
    ...(session ? { exam: { session } } : {}),
    ...(passed === 'true'  ? { passed: true }  : {}),
    ...(passed === 'false' ? { passed: false } : {}),
    ...(search ? {
      OR: [
        { student: { fullName:    { contains: search, mode: 'insensitive' } } },
        { student: { matricNumber:{ contains: search, mode: 'insensitive' } } },
        { exam:    { title:       { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [results, total, sessions] = await Promise.all([
    prisma.examResult.findMany({
      where, orderBy: { generatedAt: 'desc' }, skip: (page - 1) * take, take,
      select: {
        id: true, score: true, percentage: true, passed: true,
        grade: true, violationCount: true, timeTakenSecs: true, submittedAt: true,
        student: { select: { fullName: true, matricNumber: true } },
        exam: {
          select: {
            title: true, session: true,
            course: {
              select: {
                code: true,
                department: { select: { name: true, college: { select: { abbreviation: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.examResult.count({ where }),
    prisma.exam.findMany({ distinct: ['session'], select: { session: true }, orderBy: { session: 'desc' } }),
  ]);

  return { results, total, page, take, search, session, passed, sessions: sessions.map(s => s.session) };
};
