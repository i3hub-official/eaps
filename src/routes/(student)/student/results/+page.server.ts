// src/routes/student/results/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'
import { env } from '$env/dynamic/private'
import Groq from 'groq-sdk'
import type { Prisma } from '@prisma/client'

const MODEL = 'llama-3.3-70b-versatile'

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

  // ── AI study insight (streamed) ──────────────────────────────────────────
  // Adapted from a Groq-based recommendation feature in another project.
  // Deliberately NOT awaited here — it's assigned as a pending promise, and
  // +page.svelte resolves it with `{#await data.recommendations}`. That way
  // a slow/failed LLM call never blocks the transcript itself from
  // rendering, since everything above this point is real, already-fetched
  // data the student is waiting on.
  async function getRecommendations(): Promise<string | null> {
    if (!env.GROQ_API_KEY) {
      // Not configured — fail quietly rather than breaking the page.
      // Add GROQ_API_KEY to your .env and `npm install groq-sdk` to enable.
      return null
    }
    try {
      const groq = new Groq({ apiKey: env.GROQ_API_KEY })

      const allCourses = sessionSummaries.flatMap((s) => s.courses)
      const failed = allCourses.filter((c) => c.grade === 'F')
      const low = allCourses.filter((c) => c.grade === 'D' || c.grade === 'E')
      const strong = allCourses.filter((c) => c.grade === 'A')

      if (allCourses.length === 0) return null // nothing finalized yet — nothing to say

      const res = await groq.chat.completions.create({
        model: MODEL,
        max_tokens: 800,
        messages: [
          { role: 'system', content: 'You are a warm, knowledgeable academic advisor at a Nigerian university.' },
          {
            role: 'user',
            content: `
You are an academic advisor at MOUAU (Michael Okpara University of Agriculture, Umudike).
CGPA: ${cgpa ?? 'Not yet available'} / 5.00
Failed courses: ${failed.map((c) => `${c.courseCode} (${c.courseTitle})`).join(', ') || 'None'}
Low-scoring (D/E): ${low.map((c) => `${c.courseCode} (${c.courseTitle})`).join(', ') || 'None'}
Strong (A): ${strong.map((c) => `${c.courseCode} (${c.courseTitle})`).join(', ') || 'None'}
Sessions completed: ${sessionSummaries.length}

Provide personalised, actionable study recommendations:
1. Overall assessment (2-3 sentences)
2. Priority areas to improve (bullet points)
3. Study strategies for weak areas (bullet points)
4. Encouragement and next steps (2-3 sentences)
Address the student directly. Be warm and specific.`.trim(),
          },
        ],
      })
      return res.choices[0]?.message?.content ?? null
    } catch (err) {
      console.error('[Groq] recommendation failed:', err)
      return null
    }
  }

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
      // Lets the "Review Questions" link only show up where it's actually
      // allowed — see /student/results/[resultId]/review.
      allowReview: r.assessment.allowReview,
    })),
    recommendations: getRecommendations(),
  }
}