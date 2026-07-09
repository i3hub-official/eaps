// src/routes/student/tests/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const now = new Date()

  const [assessments, faceDescriptor] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        type: 'TEST',
        status: { in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE'] },
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
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.faceDescriptor.findUnique({ where: { studentId: student.id } }),
  ])

  const faceEnrolled = Boolean(faceDescriptor)

  return {
    faceEnrolled,
    tests: assessments.map((a) => {
      const attemptsUsed = a.sessions.length
      const attemptsRemaining = Math.max(a.maxAttempts - attemptsUsed, 0)
      const latestSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
      )

      const opensInFuture = a.startTime ? now < a.startTime : false
      const closed = a.endTime ? now > a.endTime : false

      const canStart =
        faceEnrolled &&
        attemptsRemaining > 0 &&
        !inProgressSession &&
        !opensInFuture &&
        !closed &&
        (a.status === 'PUBLISHED' || a.status === 'ACTIVE')

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
        startTime: a.startTime,
        endTime: a.endTime,
        opensInFuture,
        closed,
        status: a.status,
        requireFaceVerify: a.requireFaceVerify,
        fullscreenRequired: a.fullscreenRequired,
        canStart,
        inProgressSessionId: inProgressSession?.id ?? null,
        course: a.course ? { code: a.course.code, title: a.course.title } : null,
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
      return fail(400, { startError: 'Missing test id.' })
    }

    const prisma = await getPrismaClient()

    const [assessment, faceDescriptor] = await Promise.all([
      prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          eligibility: true,
          sessions: { where: { studentId: student.id } },
        },
      }),
      prisma.faceDescriptor.findUnique({ where: { studentId: student.id } }),
    ])

    if (!assessment || assessment.type !== 'TEST') {
      return fail(404, { startError: 'Test not found.' })
    }
    if (assessment.status !== 'PUBLISHED' && assessment.status !== 'ACTIVE') {
      return fail(400, { startError: 'This test is not currently open.' })
    }

    const eligible = assessment.eligibility.some(
      (e) =>
        e.departmentId === student.departmentId ||
        e.levelId === student.currentLevelId ||
        e.studentId === student.id,
    )
    if (!eligible) {
      return fail(403, { startError: 'You are not eligible for this test.' })
    }

    const now = new Date()
    if (assessment.startTime && now < assessment.startTime) {
      return fail(400, { startError: 'This test has not opened yet.' })
    }
    if (assessment.endTime && now > assessment.endTime) {
      return fail(400, { startError: 'This test has closed.' })
    }

    // Face verification is mandatory for TEST type — never let a student
    // into a session that will have nothing to verify against.
    if (assessment.requireFaceVerify && !faceDescriptor) {
      return fail(400, {
        startError: 'You must enroll your face before taking this test.',
        needsFaceEnrollment: true,
      })
    }

    const existingActive = assessment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    )
    if (existingActive) {
      throw redirect(303, `/student/tests/${existingActive.id}`)
    }

    const attemptsUsed = assessment.sessions.length
    if (attemptsUsed >= assessment.maxAttempts) {
      return fail(400, { startError: 'You have used all attempts for this test.' })
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

    // NOTE: /student/tests/[sessionId] doesn't exist yet. It needs to handle:
    // face verification capture BEFORE the timer starts, fullscreen lock
    // enforcement, question rendering, violation logging, and submission.
    // This redirect will 404 until that route is built.
    throw redirect(303, `/student/tests/${session.id}`)
  },
}