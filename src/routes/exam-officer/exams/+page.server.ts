// src/routes/exam-officer/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = requireExamOfficer(locals.user);
  if (!user.collegeId) throw error(400, 'Exam officer must be associated with a college');
  const collegeId = user.collegeId;

  const prisma  = await getPrismaClient();
  const status  = url.searchParams.get('status') || '';
  const session = url.searchParams.get('session') || '';
  const search  = url.searchParams.get('q') || '';
  const page    = Math.max(1, Number(url.searchParams.get('page') || 1));
  const take    = 25;

  // Resolve once: every department in this college
  const deptIds = (await prisma.department.findMany({
    where: { collegeId },
    select: { id: true },
  })).map(d => d.id);

  const scopedWhere: any = {
    OR: [
      { course: { departmentId: { in: deptIds } } },
      { offering: { departments: { some: { departmentId: { in: deptIds } } } } },
    ],
    ...(status  ? { status }                                          : {}),
    ...(session ? { session }                                         : {}),
    ...(search  ? { title: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [exams, total, sessions] = await Promise.all([
    prisma.exam.findMany({
      where: scopedWhere, orderBy: { scheduledStart: 'desc' }, skip: (page - 1) * take, take,
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
    prisma.exam.count({ where: scopedWhere }),
    prisma.exam.findMany({
      where: scopedWhere,
      distinct: ['session'], select: { session: true }, orderBy: { session: 'desc' },
    }),
  ]);

  return { exams, total, page, take, status, session, search, sessions: sessions.map(s => s.session) };
};