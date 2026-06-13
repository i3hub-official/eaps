// src/routes/(admin)/security/flagged/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
          const prisma = await getPrismaClient();

  // ── All queries in parallel ──────────────────────────────────────────────
  const [sessions, total, forceSubmitted, underReview] = await Promise.all([

    prisma.examSession.findMany({
      where: { status: { in: ['flagged', 'force_submitted'] } },
      select: {
        id:          true,
        status:      true,
        startedAt:   true,
        submittedAt: true,
        student: {
          select: { fullName: true, matricNumber: true },
        },
        exam: {
          select: {
            title: true,
            course: { select: { code: true } },
          },
        },
        invigilator: {
          select: { fullName: true },
        },
        examResult: {
          select: { score: true },
        },
        _count: {
          select: { violations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.examSession.count({
      where: { status: { in: ['flagged', 'force_submitted'] } },
    }),

    prisma.examSession.count({ where: { status: 'force_submitted' } }),

    prisma.examSession.count({ where: { status: 'flagged' } }),
  ]);

  // ── Format ───────────────────────────────────────────────────────────────
  const formatted = sessions.map((s, i) => {
    const durationMin =
      s.startedAt && s.submittedAt
        ? Math.round(
            (s.submittedAt.getTime() - s.startedAt.getTime()) / 60_000,
          )
        : null;

    const examLabel = s.exam?.course?.code
      ? `${s.exam.course.code} — ${s.exam.title}`
      : (s.exam?.title ?? '—');

    return {
      id:          `S${String(i + 1).padStart(3, '0')}`,
      student:     s.student?.fullName    ?? 'Unknown',
      matric:      s.student?.matricNumber ?? '—',
      exam:        examLabel,
      flags:       s._count.violations,
      status:      s.status,
      invigilator: s.invigilator?.fullName ?? 'Unassigned',
      duration:    durationMin !== null ? `${durationMin} min` : '—',
      score:       s.examResult?.score != null
                     ? parseFloat(s.examResult.score.toString())
                     : null,
    };
  });

  return {
    sessions: formatted,
    summary: {
      total,
      forceSubmitted,
      underReview,
      cleared: 0, // extend later with a 'cleared' status if added to schema
    },
  };
};