// src/routes/student/tests/+page.server.ts

import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'
import { createSession } from '$lib/server/assessments/engine'

const TERMINAL_STATUSES = ['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'] as const

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const now = new Date()

  // ─── Get current active semester ──────────────────────────────────────
  let currentSemester = await prisma.semester.findFirst({
    where: {
      isCurrent: true,
      registrationEnabled: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: { session: true },
  })

  if (!currentSemester) {
    currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true, registrationEnabled: true },
      orderBy: { startDate: 'desc' },
      include: { session: true },
    })
  }

  if (!currentSemester) {
    currentSemester = await prisma.semester.findFirst({
      where: { registrationEnabled: true },
      orderBy: { startDate: 'desc' },
      include: { session: true },
    })
  }

  // ─── Get student's approved course registrations ──────────────────────
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: student.id,
      status: 'APPROVED',
      ...(currentSemester && {
        semesterId: currentSemester.id,
        sessionId: currentSemester.sessionId,
      }),
    },
    select: {
      courseId: true,
      levelId: true,
    },
  })

  const registeredCourseIds = registrations.map((r) => r.courseId)
  const studentLevelId = student.currentLevelId

  if (registeredCourseIds.length === 0) {
    return {
      faceEnrolled: false,
      currentSemester: currentSemester
        ? {
            id: currentSemester.id,
            name: `${currentSemester.type} ${currentSemester.session?.name || ''}`,
            startDate: currentSemester.startDate,
            endDate: currentSemester.endDate,
            isWithinDateRange: now >= currentSemester.startDate && now <= currentSemester.endDate,
          }
        : null,
      tests: [],
      message: 'You are not registered for any courses this semester.',
    }
  }

  const whereClause: any = {
    type: 'TEST',
    status: { in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'] },
    courseId: { in: registeredCourseIds },
    eligibility: {
      some: {
        OR: [
          { departmentId: student.departmentId },
          { levelId: studentLevelId },
          { studentId: student.id },
        ],
      },
    },
  }

  if (currentSemester) {
    whereClause.course = {
      offerings: {
        some: {
          semesterId: currentSemester.id,
        },
      },
    }
  }

  const [assessments, faceDescriptor] = await Promise.all([
    prisma.assessment.findMany({
      where: whereClause,
      include: {
        course: {
          include: {
            level: true,
          },
        },
        sessions: {
          where: { studentId: student.id },
          orderBy: { attemptNumber: 'desc' },
          include: { result: true },
        },
        eligibility: true,
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.faceDescriptor.findUnique({ where: { studentId: student.id } }),
  ])

  const faceEnrolled = Boolean(faceDescriptor)

  return {
    faceEnrolled,
    currentSemester: currentSemester
      ? {
          id: currentSemester.id,
          name: `${currentSemester.type} ${currentSemester.session?.name || ''}`,
          startDate: currentSemester.startDate,
          endDate: currentSemester.endDate,
          isWithinDateRange: now >= currentSemester.startDate && now <= currentSemester.endDate,
        }
      : null,
    tests: assessments.map((a) => {
      const attemptsUsed = a.sessions.length
      const attemptsRemaining = a.maxAttempts > 0 ? Math.max(a.maxAttempts - attemptsUsed, 0) : null
      const latestSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
      )
      const latestTerminalSession = a.sessions.find((s) =>
        TERMINAL_STATUSES.includes(s.status as (typeof TERMINAL_STATUSES)[number])
      )

      const opensInFuture = a.status === 'SCHEDULED' || (a.startTime ? now < a.startTime : false)
      const closed =
        a.status === 'ENDED' || a.status === 'CANCELLED' || (a.endTime ? now > a.endTime : false)
      const cancelled = a.status === 'CANCELLED'

      const completed = a.maxAttempts > 0 && attemptsRemaining === 0 && Boolean(latestTerminalSession)

      let displayStatus:
        | 'CANCELLED'
        | 'IN_PROGRESS'
        | 'UPCOMING'
        | 'ENDED'
        | 'COMPLETED'
        | 'OPEN'

      if (cancelled) {
        displayStatus = 'CANCELLED'
      } else if (inProgressSession) {
        displayStatus = 'IN_PROGRESS'
      } else if (completed) {
        displayStatus = 'COMPLETED'
      } else if (opensInFuture) {
        displayStatus = 'UPCOMING'
      } else if (closed) {
        displayStatus = 'ENDED'
      } else {
        displayStatus = 'OPEN'
      }

      const canStart =
        faceEnrolled &&
        (attemptsRemaining === null || attemptsRemaining > 0) &&
        !inProgressSession &&
        !opensInFuture &&
        !closed &&
        !cancelled &&
        (a.status === 'PUBLISHED' || a.status === 'ACTIVE')

      // Compute best score if bestScoreOnly is enabled
      const bestSession = a.bestScoreOnly
        ? a.sessions
            .filter((s) => s.result?.isReleased)
            .sort((s1, s2) => {
              const p1 = Number(s1.result?.percentage ?? 0)
              const p2 = Number(s2.result?.percentage ?? 0)
              return p2 - p1
            })[0]
        : latestSession

      // Compute retake block time
      let retakeBlockedUntil: Date | null = null
      if (latestTerminalSession && a.retakeDelayMinutes > 0) {
        const blockTime = new Date(
          (latestTerminalSession.submittedAt?.getTime() ?? now.getTime()) +
            a.retakeDelayMinutes * 60 * 1000
        )
        if (now < blockTime) {
          retakeBlockedUntil = blockTime
        }
      }

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
        cancelled,
        completed,
        displayStatus,
        status: a.status,
        requireFaceVerify: a.requireFaceVerify,
        fullscreenRequired: a.fullscreenRequired,
        canStart,
        inProgressSessionId: inProgressSession?.id ?? null,
        completedSessionId: latestTerminalSession?.id ?? null,
        completedSessionStatus: latestTerminalSession?.status ?? null,
        bestScoreOnly: a.bestScoreOnly,
        allowRetakes: a.allowRetakes,
        retakeDelayMinutes: a.retakeDelayMinutes,
        retakeBlockedUntil,
        paperVariants: a.paperVariants,
        course: a.course
          ? {
              code: a.course.code,
              title: a.course.title,
              level: a.course.level?.name,
            }
          : null,
        result: bestSession?.result
          ? {
              percentage: bestSession.result.percentage.toString(),
              grade: bestSession.result.grade,
              marksObtained: bestSession.result.marksObtained.toString(),
              totalMarks: bestSession.result.totalMarks.toString(),
              isReleased: bestSession.result.isReleased,
            }
          : null,
      }
    }),
  }
}

export const actions: Actions = {
  start: async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user)

    const form = await request.formData()
    const assessmentId = form.get('assessmentId')?.toString()

    if (!assessmentId) {
      return fail(400, { startError: 'Missing test id.' })
    }

    const prisma = await getPrismaClient()
    const now = new Date()

    let currentSemester = await prisma.semester.findFirst({
      where: {
        isCurrent: true,
        registrationEnabled: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    })

    if (!currentSemester) {
      currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true, registrationEnabled: true },
        orderBy: { startDate: 'desc' },
      })
    }

    if (!currentSemester) {
      return fail(400, { startError: 'No active semester found.' })
    }

    const registration = await prisma.courseRegistration.findFirst({
      where: {
        studentId: student.id,
        status: 'APPROVED',
        semesterId: currentSemester.id,
        course: {
          assessments: {
            some: { id: assessmentId },
          },
        },
      },
    })

    if (!registration) {
      return fail(403, {
        startError:
          'You are not registered for the course this test belongs to. Please register for the course first.',
      })
    }

    const [assessment, faceDescriptor] = await Promise.all([
      prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          eligibility: true,
          sessions: { where: { studentId: student.id }, orderBy: { attemptNumber: 'desc' } },
          course: true,
        },
      }),
      prisma.faceDescriptor.findUnique({ where: { studentId: student.id } }),
    ])

    if (!assessment || assessment.type !== 'TEST') {
      return fail(404, { startError: 'Test not found.' })
    }
    if (assessment.status === 'CANCELLED') {
      return fail(400, { startError: 'This test has been cancelled.' })
    }
    if (assessment.status === 'ENDED') {
      return fail(400, { startError: 'This test has closed.' })
    }
    if (assessment.status !== 'PUBLISHED' && assessment.status !== 'ACTIVE') {
      return fail(400, { startError: 'This test is not currently open.' })
    }

    const eligible = assessment.eligibility.some(
      (e) =>
        e.departmentId === student.departmentId ||
        e.levelId === student.currentLevelId ||
        e.studentId === student.id
    )
    if (!eligible) {
      return fail(403, { startError: 'You are not eligible for this test.' })
    }

    if (assessment.startTime && now < assessment.startTime) {
      return fail(400, { startError: 'This test has not opened yet.' })
    }
    if (assessment.endTime && now > assessment.endTime) {
      return fail(400, { startError: 'This test has closed.' })
    }

    if (!faceDescriptor) {
      return fail(400, {
        startError: 'You must enroll your face before taking any test.',
        needsFaceEnrollment: true,
      })
    }

    const existingActive = assessment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
    )
    if (existingActive) {
      throw redirect(303, `/student/tests/${existingActive.id}`)
    }

    // Check retake delay
    if (assessment.retakeDelayMinutes > 0) {
      const lastTerminal = assessment.sessions.find((s) =>
        TERMINAL_STATUSES.includes(s.status as (typeof TERMINAL_STATUSES)[number])
      )
      if (lastTerminal && lastTerminal.submittedAt) {
        const timeSinceLastAttempt = now.getTime() - lastTerminal.submittedAt.getTime()
        const delayMs = assessment.retakeDelayMinutes * 60 * 1000
        if (timeSinceLastAttempt < delayMs) {
          const nextAttemptTime = new Date(lastTerminal.submittedAt.getTime() + delayMs)
          return fail(400, {
            startError: `You must wait ${assessment.retakeDelayMinutes} minutes between attempts. Next attempt available at ${nextAttemptTime.toLocaleTimeString()}.`,
          })
        }
      }
    }

    const attemptsUsed = assessment.sessions.length
    if (assessment.maxAttempts > 0 && attemptsUsed >= assessment.maxAttempts) {
      const latestTerminalSession = assessment.sessions.find((s) =>
        TERMINAL_STATUSES.includes(s.status as (typeof TERMINAL_STATUSES)[number])
      )
      if (latestTerminalSession) {
        throw redirect(303, `/student/tests/${latestTerminalSession.id}/result`)
      }
      return fail(400, { startError: 'You have used all attempts for this test.' })
    }

    const ip = getClientAddress()
    const userAgent = request.headers.get('user-agent') ?? undefined
    const session = await createSession(assessment.id, student.id, { ipAddress: ip, userAgent })

    throw redirect(303, `/student/tests/${session.id}`)
  },
}