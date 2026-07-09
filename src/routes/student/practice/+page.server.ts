// src/routes/student/practice/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const now = new Date()

  const assessments = await prisma.assessment.findMany({
    where: {
      type: 'PRACTICE',
      status: 'PUBLISHED',
      // Practice assessments are usually open-ended, but respect
      // startTime/endTime if the lecturer set one.
      OR: [{ startTime: null }, { startTime: { lte: now } }],
      AND: [
        {
          OR: [{ endTime: null }, { endTime: { gte: now } }],
        },
      ],
      eligibility: {
        some: {
          OR: [
            { departmentId: student.departmentId },
            { levelId: student.currentLevelId },
            { studentId: student.id },
          ],
        },
      },
    },
    include: {
      course: true,
      sessions: {
        where: { studentId: student.id },
        orderBy: { attemptNumber: 'desc' },
        include: { result: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    practiceAssessments: assessments.map((a) => {
      const attemptsUsed = a.sessions.length
      const attemptsRemaining = Math.max(a.maxAttempts - attemptsUsed, 0)
      const lastSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
      )

      return {
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        durationMinutes: a.durationMinutes,
        totalMarks: a.totalMarks.toString(),
        questionCount: a.questionCount,
        maxAttempts: a.maxAttempts,
        attemptsUsed,
        attemptsRemaining,
        canStart: attemptsRemaining > 0 && !inProgressSession,
        inProgressSessionId: inProgressSession?.id ?? null,
        course: a.course ? { code: a.course.code, title: a.course.title } : null,
        lastResult: lastSession?.result
          ? {
              percentage: lastSession.result.percentage.toString(),
              grade: lastSession.result.grade,
              marksObtained: lastSession.result.marksObtained.toString(),
              totalMarks: lastSession.result.totalMarks.toString(),
            }
          : null,
      }
    }),
  }
}

export const actions: Actions = {
  start: async ({ request, locals }) => {
    const student = await requireStudent(locals.user)

    const form = await request.formData()
    const assessmentId = form.get('assessmentId')?.toString()

    if (!assessmentId) {
      return fail(400, { startError: 'Missing assessment id.' })
    }

    const prisma = await getPrismaClient()

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        eligibility: true,
        sessions: { where: { studentId: student.id } },
      },
    })

    if (!assessment || assessment.type !== 'PRACTICE' || assessment.status !== 'PUBLISHED') {
      return fail(404, { startError: 'Practice assessment not found or no longer available.' })
    }

    // Re-verify eligibility server-side — never trust that the button
    // only rendered because the list looked eligible on load.
    const eligible = assessment.eligibility.some(
      (e) =>
        e.departmentId === student.departmentId ||
        e.levelId === student.currentLevelId ||
        e.studentId === student.id,
    )
    if (!eligible) {
      return fail(403, { startError: 'You are not eligible for this practice assessment.' })
    }

    // Resume an existing in-progress attempt instead of creating a new one.
    const existingActive = assessment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    )
    if (existingActive) {
      throw redirect(303, `/student/practice/${existingActive.id}`)
    }

    const attemptsUsed = assessment.sessions.length
    if (attemptsUsed >= assessment.maxAttempts) {
      return fail(400, { startError: 'You have used all attempts for this practice test.' })
    }

    const session = await prisma.assessmentSession.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        attemptNumber: attemptsUsed + 1,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + assessment.durationMinutes * 60 * 1000),
      },
    })

    // NOTE: /student/practice/[sessionId] (the actual question-runner page —
    // timer, question rendering, answer submission) doesn't exist yet.
    // This redirect will 404 until that route is built.
    throw redirect(303, `/student/practice/${session.id}`)
  },
}