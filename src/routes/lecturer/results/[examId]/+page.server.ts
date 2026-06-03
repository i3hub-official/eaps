// src/routes/lecturer/results/[examId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
await requireLecturer(locals);

  // Ensure this exam belongs to this lecturer
  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { select: { code: true, title: true, creditUnits: true } },
      questions: {
        select: {
          id: true, body: true, topic: true, marks: true, type: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
      _count: { select: { examSessions: true } },
    },
  });

  if (!exam) error(404, 'Exam not found');
  if (exam.createdBy !== locals.user.id) error(403, 'Not your exam');

  // All results with full answer breakdown
  const results = await prisma.examResult.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id: true, title: true, fullName: true,
          matricNumber: true, level: true,
          department: { select: { name: true } },
        },
      },
      session: {
        select: {
          id: true, status: true, startedAt: true, submittedAt: true,
          violationCount: true,
          studentAnswers: {
            select: {
              questionId: true, isCorrect: true, marksEarned: true,
              question: { select: { topic: true, type: true, marks: true } },
            },
          },
        },
      },
    },
    orderBy: { percentage: 'desc' },
  });

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const totalStudents  = results.length;
  const passed         = results.filter(r => r.passed).length;
  const failed         = totalStudents - passed;
  const passRate       = totalStudents > 0 ? Math.round((passed / totalStudents) * 100) : 0;
  const avgPercentage  = totalStudents > 0
    ? results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / totalStudents
    : 0;
  const highestScore   = totalStudents > 0 ? Math.max(...results.map(r => Number(r.percentage ?? 0))) : 0;
  const lowestScore    = totalStudents > 0 ? Math.min(...results.map(r => Number(r.percentage ?? 0))) : 0;

  // ── Grade distribution ────────────────────────────────────────────────────
  const gradeDist = results.reduce((acc, r) => {
    const g = r.grade ?? 'N/A';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Topic-level weakness/strength ─────────────────────────────────────────
  // Group all student answers by topic → compute correct rate per topic
  const topicMap = new Map<string, { correct: number; total: number; marks: number; earned: number }>();

  for (const result of results) {
    for (const ans of result.session.studentAnswers) {
      const topic = ans.question.topic ?? 'General';
      const entry = topicMap.get(topic) ?? { correct: 0, total: 0, marks: 0, earned: 0 };
      entry.total  += 1;
      entry.marks  += ans.question.marks;
      entry.earned += Number(ans.marksEarned);
      if (ans.isCorrect) entry.correct += 1;
      topicMap.set(topic, entry);
    }
  }

  const topicStats = Array.from(topicMap.entries())
    .map(([topic, s]) => ({
      topic,
      correctRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      scoreRate:   s.marks  > 0 ? Math.round((s.earned / s.marks)  * 100) : 0,
      total: s.total, correct: s.correct,
    }))
    .sort((a, b) => a.correctRate - b.correctRate);   // weakest first

  const weakTopics     = topicStats.slice(0, 3);
  const strongTopics   = [...topicStats].reverse().slice(0, 3);

  // ── Per-student topic breakdown (for the detail table) ────────────────────
  const studentBreakdowns = results.map(r => {
    const byTopic: Record<string, { correct: number; total: number }> = {};
    for (const ans of r.session.studentAnswers) {
      const topic = ans.question.topic ?? 'General';
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
      byTopic[topic].total  += 1;
      if (ans.isCorrect) byTopic[topic].correct += 1;
    }
    const weakestTopic = Object.entries(byTopic)
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))[0]?.[0] ?? '—';
    const strongestTopic = Object.entries(byTopic)
      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))[0]?.[0] ?? '—';
    return {
      studentId: r.studentId,
      weakestTopic,
      strongestTopic,
      byTopic,
    };
  });

  return {
    exam,
    results,
    studentBreakdowns,
    stats: { totalStudents, passed, failed, passRate, avgPercentage, highestScore, lowestScore },
    gradeDist,
    topicStats,
    weakTopics,
    strongTopics,
    allTopics: Array.from(topicMap.keys()),
  };
};