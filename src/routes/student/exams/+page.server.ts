// src/routes/student/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireStudent(locals.user);

  // Derive current session/semester from date if user.session not set
  const currentSession = user.session ?? deriveSessionFromDate();
  const currentSemester = deriveSemesterFromDate();

  // Fetch ALL registered courses for this student across all registration types
  // — normal, borrowed, carryover all treated equally
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: user.id,
      session: currentSession,
      semester: currentSemester,
    },
    include: {
      course: {
        include: {
          exams: {
            where: {
              status: { in: ['active', 'scheduled', 'completed'] },
              session: currentSession,
              semester: currentSemester,
            },
            include: {
              examSessions: {
                where: { studentId: user.id },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Flatten: one entry per exam
  const examEntries: Array<{
    id: string;
    sessionId: string | null;
    title: string;
    courseCode: string;
    courseTitle: string;
    status: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    durationMinutes: number;
    totalMarks: number;
    passMark: number;
    score: number | null;
    isGraded: boolean;
    violationCount: number;
    registrationType: string;
  }> = [];

  for (const reg of registrations) {
    for (const exam of reg.course.exams) {
      const session = exam.examSessions[0];

      examEntries.push({
        id: exam.id,
        sessionId: session?.id ?? null,
        title: exam.title,
        courseCode: reg.course.code,
        courseTitle: reg.course.title,
        status: session?.status ?? 'not_started',
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        score: session?.score ?? null,
        isGraded: session?.isGraded ?? false,
        violationCount: session?.violationCount ?? 0,
        registrationType: reg.registrationType,
      });
    }
  }

  // Results (all-time, for history)
  const results = await prisma.examResult.findMany({
    where: { studentId: user.id },
    orderBy: { generatedAt: 'desc' },
    include: {
      exam: {
        select: {
          title: true,
          course: { select: { code: true } },
        },
      },
    },
  });

  return {
    exams: examEntries,
    results: results.map(r => ({
      id: r.id,
      examId: r.examId,
      examTitle: r.exam.title,
      courseCode: r.exam.course?.code,
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      submittedAt: r.submittedAt,
    })),
    meta: {
      session: currentSession,
      semester: currentSemester,
    },
  };
};

// ── Session derivation ────────────────────────────────────────────────────────
// Academic session format: "2025/2026"
// First semester: Oct–Mar, Second semester: Apr–Sep
function deriveSessionFromDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // If we're in the second half of the year, session spans to next year
  if (month >= 10) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}

function deriveSemesterFromDate(): number {
  const month = new Date().getMonth() + 1;
  // First semester: Oct(10) – Mar(3)
  // Second semester: Apr(4) – Sep(9)
  return month >= 4 && month <= 9 ? 2 : 1;
}