// src/routes/admin/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals.user);

  const prisma = await getPrismaClient();

  const status = url.searchParams.get('status') ?? undefined;
  const search = url.searchParams.get('q') ?? undefined;
  const page   = Number(url.searchParams.get('page') ?? 1);
  const limit  = 20;

  const where = {
    ...(status ? { status: status as any } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { course: { code: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {}),
  };

  const [exams, total, stats] = await prisma.$transaction([
    prisma.exam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        course: { select: { code: true, title: true } },
        lecturer: { select: { fullName: true } },
        _count: { select: { questions: true, examSessions: true, examResults: true } },
      },
    }),
    prisma.exam.count({ where }),
    prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status, COUNT(*) as count FROM exams GROUP BY status
    `,
  ]);

  // Serialize Decimal values from exams
  const serializedExams = exams.map(exam => ({
    ...exam,
    marksPerQuestion: exam.marksPerQuestion ? Number(exam.marksPerQuestion) : null,
    totalMarks: Number(exam.totalMarks),
    passMark: Number(exam.passMark),
    durationMinutes: Number(exam.durationMinutes),
    lateEntryMinutes: Number(exam.lateEntryMinutes),
    maxViolations: Number(exam.maxViolations),
    questionsToPresent: Number(exam.questionsToPresent),
    semester: Number(exam.semester),
  }));

  return {
    exams: serializedExams,
    total,
    page,
    limit,
    statusFilter: status ?? 'all',
    search: search ?? '',
    stats: (stats as any[]).reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {} as Record<string, number>),
  };
};