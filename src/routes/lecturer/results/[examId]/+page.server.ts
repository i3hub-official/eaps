// src/routes/lecturer/results/[examId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = requireLecturer(locals.user);

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: { 
        select: { 
          code: true, 
          title: true, 
          creditUnits: true,
          department: { select: { id: true, name: true, college: { select: { id: true, name: true, abbreviation: true } } } }
        } 
      },
      questions: {
        select: {
          id: true, body: true, topic: true, marks: true, type: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
      levels: { select: { id: true, level: true } },
      _count: { select: { examSessions: true } },
    },
  });

  if (!exam) error(404, 'Exam not found');
  if (exam.createdBy !== user.id) error(403, 'Not your exam');

  const results = await prisma.examResult.findMany({
    where: { examId: params.examId },
    include: {
      student: {
        select: {
          id: true, title: true, fullName: true,
          matricNumber: true, 
          level: { select: { id: true, level: true } },
          department: { select: { id: true, name: true, college: { select: { id: true, name: true } } } },
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
  const totalStudents = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = totalStudents - passed;
  const passRate = totalStudents > 0 ? Math.round((passed / totalStudents) * 100) : 0;
  const avgPercentage = totalStudents > 0
    ? results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / totalStudents
    : 0;
  const highestScore = totalStudents > 0 ? Math.max(...results.map(r => Number(r.percentage ?? 0))) : 0;
  const lowestScore = totalStudents > 0 ? Math.min(...results.map(r => Number(r.percentage ?? 0))) : 0;

  // ── Grade distribution ────────────────────────────────────────────────────
  const gradeDist = results.reduce((acc, r) => {
    const g = r.grade ?? 'N/A';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Topic analysis ───────────────────────────────────────────────────────
  const topicMap = new Map<string, { correct: number; total: number; marks: number; earned: number }>();
  for (const result of results) {
    for (const ans of result.session.studentAnswers) {
      const topic = ans.question.topic ?? 'General';
      const entry = topicMap.get(topic) ?? { correct: 0, total: 0, marks: 0, earned: 0 };
      entry.total += 1;
      entry.marks += ans.question.marks;
      entry.earned += Number(ans.marksEarned);
      if (ans.isCorrect) entry.correct += 1;
      topicMap.set(topic, entry);
    }
  }

  const topicStats = Array.from(topicMap.entries())
    .map(([topic, s]) => ({
      topic,
      correctRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      scoreRate: s.marks > 0 ? Math.round((s.earned / s.marks) * 100) : 0,
      total: s.total, correct: s.correct,
    }))
    .sort((a, b) => a.correctRate - b.correctRate);

  const weakTopics = topicStats.slice(0, 3);
  const strongTopics = [...topicStats].reverse().slice(0, 3);

  // ── Student breakdowns with grouping keys ─────────────────────────────────
  const studentBreakdowns = results.map(r => {
    const byTopic: Record<string, { correct: number; total: number }> = {};
    for (const ans of r.session.studentAnswers) {
      const topic = ans.question.topic ?? 'General';
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
      byTopic[topic].total += 1;
      if (ans.isCorrect) byTopic[topic].correct += 1;
    }
    const sortedTopics = Object.entries(byTopic).sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total));
    const weakestTopic = sortedTopics[0]?.[0] ?? '—';
    const strongestTopic = [...sortedTopics].reverse()[0]?.[0] ?? '—';

    return {
      studentId: r.studentId,
      weakestTopic,
      strongestTopic,
      byTopic,
      // Grouping keys for filtering
      levelId: r.student.level?.id ?? 'unknown',
      levelName: r.student.level?.level ? `${r.student.level.level} Level` : 'Unknown',
      departmentId: r.student.department?.id ?? 'unknown',
      departmentName: r.student.department?.name ?? 'Unknown',
      collegeId: r.student.department?.college?.id ?? 'unknown',
      collegeName: r.student.department?.college?.name ?? 'Unknown',
    };
  });

  // ── Build groupings ───────────────────────────────────────────────────────
  const groupBy = <T extends string | number>(keyFn: (r: typeof results[0], b: typeof studentBreakdowns[0]) => T, nameFn: (key: T) => string) => {
    const groups = new Map<T, any>();
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const b = studentBreakdowns[i];
      const key = keyFn(r, b);
      if (!groups.has(key)) {
        groups.set(key, {
          key: String(key),
          name: nameFn(key),
          results: [],
          totalStudents: 0,
          passed: 0,
          failed: 0,
          avgScoreSum: 0,
          avgScoreCount: 0,
        });
      }
      const g = groups.get(key);
      g.results.push({ ...r, breakdown: b });
      g.totalStudents += 1;
      if (r.passed) g.passed += 1; else g.failed += 1;
      if (r.percentage != null) {
        g.avgScoreSum += Number(r.percentage);
        g.avgScoreCount += 1;
      }
    }
    return Array.from(groups.values()).map(g => ({
      ...g,
      avgScore: g.avgScoreCount > 0 ? Math.round((g.avgScoreSum / g.avgScoreCount) * 10) / 10 : null,
      passRate: g.totalStudents > 0 ? Math.round((g.passed / g.totalStudents) * 100) : 0,
    }));
  };

  const byLevel = groupBy(
    (_, b) => b.levelId,
    (k) => studentBreakdowns.find(b => b.levelId === k)?.levelName ?? 'Unknown'
  ).sort((a, b) => {
    const aNum = parseInt(a.name);
    const bNum = parseInt(b.name);
    return (!isNaN(aNum) && !isNaN(bNum)) ? aNum - bNum : a.name.localeCompare(b.name);
  });

  const byDepartment = groupBy(
    (_, b) => b.departmentId,
    (k) => studentBreakdowns.find(b => b.departmentId === k)?.departmentName ?? 'Unknown'
  );

  const byCollege = groupBy(
    (_, b) => b.collegeId,
    (k) => studentBreakdowns.find(b => b.collegeId === k)?.collegeName ?? 'Unknown'
  );

  const byGrade = groupBy(
    (r) => r.grade ?? 'N/A',
    (k) => `Grade ${k}`
  );

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
    groupings: { byLevel, byDepartment, byCollege, byGrade },
  };
};