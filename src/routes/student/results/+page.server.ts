// src/routes/student/results/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'
import type { Prisma } from '@prisma/client'

type TranscriptEntryWithRelations = Prisma.TranscriptEntryGetPayload<{
  include: { course: true; session: true }
}>

type SessionGroup = {
  sessionId: string;
  sessionName: string;
  entries: TranscriptEntryWithRelations[];
  totalCreditUnits: number;
  totalGradePoints: number;
}

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const [results, transcriptEntries] = await Promise.all([
    // Individual assessment results (per test/exam/assignment/practice attempt).
    // Only ever show released results — an unreleased result is not final
    // and could still change before the lecturer/exam officer publishes it.
    prisma.assessmentResult.findMany({
      where: {
        studentId: student.id,
        isReleased: true,
      },
      include: {
        assessment: { include: { course: true } },
      },
      orderBy: { releasedAt: 'desc' },
    }),

    // Finalized combined CA + Exam entries (out of 100) per course per
    // session — this is the "transcript" view, distinct from individual
    // assessment attempts above.
    prisma.transcriptEntry.findMany({
      where: {
        studentId: student.id,
        isFinalized: true,
      },
      include: {
        course: true,
        session: true,
      },
      orderBy: [{ session: { startDate: 'desc' } }, { course: { code: 'asc' } }],
    }),
  ])

  // Group transcript entries by academic session for display.
  const bySession = new Map<string, SessionGroup>()

  for (const entry of transcriptEntries) {
    const key = entry.sessionId
    if (!bySession.has(key)) {
      bySession.set(key, {
        sessionId: entry.sessionId,
        sessionName: entry.session.name,
        entries: [],
        totalCreditUnits: 0,
        totalGradePoints: 0,
      })
    }
    const group = bySession.get(key)!
    group.entries.push(entry)
    if (entry.creditUnits && entry.gradePoints) {
      group.totalCreditUnits += entry.creditUnits
      group.totalGradePoints += entry.creditUnits * Number(entry.gradePoints)
    }
  }

  const sessionSummaries = Array.from(bySession.values()).map((g) => ({
    sessionId: g.sessionId,
    sessionName: g.sessionName,
    gpa: g.totalCreditUnits > 0 ? (g.totalGradePoints / g.totalCreditUnits).toFixed(2) : null,
    totalCreditUnits: g.totalCreditUnits,
    courses: g.entries.map((e) => ({
      id: e.id,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      creditUnits: e.creditUnits,
      testMark: e.testMark?.toString() ?? null,
      examMark: e.examMark?.toString() ?? null,
      totalMark: e.totalMark?.toString() ?? null,
      percentage: e.percentage?.toString() ?? null,
      grade: e.grade,
      gradePoints: e.gradePoints?.toString() ?? null,
      passed: e.passed,
    })),
  }))

  // Cumulative GPA across all finalized sessions.
  const overallCreditUnits = sessionSummaries.reduce((sum, s) => sum + s.totalCreditUnits, 0)
  const overallGradePoints = Array.from(bySession.values()).reduce(
    (sum, g) => sum + g.totalGradePoints,
    0,
  )
  const cgpa = overallCreditUnits > 0 ? (overallGradePoints / overallCreditUnits).toFixed(2) : null

  return {
    cgpa,
    sessionSummaries,
    assessmentResults: results.map((r) => ({
      id: r.id,
      title: r.assessment.title,
      type: r.assessment.type,
      course: r.assessment.course
        ? { code: r.assessment.course.code, title: r.assessment.course.title }
        : null,
      marksObtained: r.marksObtained.toString(),
      totalMarks: r.totalMarks.toString(),
      percentage: r.percentage.toString(),
      grade: r.grade,
      passed: r.passed,
      releasedAt: r.releasedAt,
      isRevised: r.isRevised,
    })),
  }
}