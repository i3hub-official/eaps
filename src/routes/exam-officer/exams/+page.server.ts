// src/routes/exam-officer/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  requireExamOfficer(locals.user);
  const prisma  = await getPrismaClient();
  const status  = url.searchParams.get('status') || '';
  const session = url.searchParams.get('session') || '';
  const search  = url.searchParams.get('q') || '';
  const page    = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take    = 25;

  const where: any = {
    ...(status  ? { status }                                          : {}),
    ...(session ? { session }                                         : {}),
    ...(search  ? { title: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [exams, total, sessions] = await Promise.all([
    prisma.exam.findMany({
      where, orderBy: { scheduledStart: 'desc' }, skip: (page - 1) * take, take,
      select: {
        id: true, title: true, status: true, scheduledStart: true, scheduledEnd: true,
        durationMinutes: true, session: true, semester: true,
        course: {
          select: {
            code: true, title: true,
            department: { select: { name: true, code: true, college: { select: { name: true, abbreviation: true } } } },
          },
        },
        lecturer: { select: { fullName: true, staffId: true } },
        _count: { select: { examSessions: true, questions: true, invigilators: true } },
      },
    }),
    prisma.exam.count({ where }),
    // distinct sessions for filter dropdown
    prisma.exam.findMany({ distinct: ['session'], select: { session: true }, orderBy: { session: 'desc' } }),
  ]);

  return { exams, total, page, take, status, session, search, sessions: sessions.map(s => s.session) };
};
