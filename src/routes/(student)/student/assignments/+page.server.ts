// src/routes/student/assignments/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

function computeDueState(assignment: { dueDate: Date | null; allowLateSubmission: boolean }) {
  if (!assignment.dueDate) return { isPastDue: false, isLate: false }
  const now = new Date()
  const isPastDue = now > assignment.dueDate
  return { isPastDue, isLate: isPastDue && assignment.allowLateSubmission }
}

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const now = new Date()

  const assignments = await prisma.assessment.findMany({
    where: {
      type: 'ASSIGNMENT',
      status: 'PUBLISHED',
      OR: [{ startTime: null }, { startTime: { lte: now } }],
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
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  return {
    assignments: assignments.map((a) => {
      const attemptsUsed = a.sessions.length
      const attemptsRemaining = Math.max(a.maxAttempts - attemptsUsed, 0)
      const latestSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
      )
      const submittedSession = a.sessions.find((s) => s.status === 'SUBMITTED')

      const { isPastDue, isLate } = computeDueState(a)
      // Can't start a fresh attempt past due date unless late submission
      // is explicitly allowed, and only if attempts remain.
      const canStart =
        attemptsRemaining > 0 && !inProgressSession && (!isPastDue || a.allowLateSubmission)

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
        dueDate: a.dueDate,
        allowLateSubmission: a.allowLateSubmission,
        latePenaltyPercent: a.latePenaltyPercent?.toString() ?? null,
        isPastDue,
        isLate,
        canStart,
        inProgressSessionId: inProgressSession?.id ?? null,
        course: a.course ? { code: a.course.code, title: a.course.title } : null,
        submission: submittedSession
          ? {
              id: submittedSession.id,
              submittedAt: submittedSession.submittedAt,
              submissionMode: submittedSession.submissionMode,
            }
          : null,
        result: latestSession?.result
          ? {
              percentage: latestSession.result.percentage.toString(),
              grade: latestSession.result.grade,
              marksObtained: latestSession.result.marksObtained.toString(),
              totalMarks: latestSession.result.totalMarks.toString(),
              isReleased: latestSession.result.isReleased,
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
      return fail(400, { startError: 'Missing assignment id.' })
    }

    const prisma = await getPrismaClient()

    const assignment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        eligibility: true,
        sessions: { where: { studentId: student.id } },
      },
    })

    if (!assignment || assignment.type !== 'ASSIGNMENT' || assignment.status !== 'PUBLISHED') {
      return fail(404, { startError: 'Assignment not found or no longer available.' })
    }

    const eligible = assignment.eligibility.some(
      (e) =>
        e.departmentId === student.departmentId ||
        e.levelId === student.currentLevelId ||
        e.studentId === student.id,
    )
    if (!eligible) {
      return fail(403, { startError: 'You are not eligible for this assignment.' })
    }

    const existingActive = assignment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    )
    if (existingActive) {
      throw redirect(303, `/student/assignments/${existingActive.id}`)
    }

    const { isPastDue } = computeDueState(assignment)
    if (isPastDue && !assignment.allowLateSubmission) {
      return fail(400, { startError: 'The due date for this assignment has passed.' })
    }

    const attemptsUsed = assignment.sessions.length
    if (attemptsUsed >= assignment.maxAttempts) {
      return fail(400, { startError: 'You have used all allowed attempts for this assignment.' })
    }

    const session = await prisma.assessmentSession.create({
      data: {
        assessmentId: assignment.id,
        studentId: student.id,
        attemptNumber: attemptsUsed + 1,
        status: 'PENDING',
        expiresAt: assignment.durationMinutes
          ? new Date(Date.now() + assignment.durationMinutes * 60 * 1000)
          : null,
      },
    })

    // NOTE: /student/assignments/[sessionId] (the actual submission runner —
    // question rendering, answer entry, file/text submission, final submit)
    // doesn't exist yet. This redirect will 404 until that route is built.
    throw redirect(303, `/student/assignments/${session.id}`)
  },
}