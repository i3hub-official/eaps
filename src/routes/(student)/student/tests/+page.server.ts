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
      const attemptsRemaining = Math.max(a.maxAttempts - attemptsUsed, 0)
      const latestSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
      )
      // Most recent attempt that actually finished (submitted, timed out, or
      // disqualified) — used to link the "already completed" notice straight
      // to that attempt's result rather than leaving the student stuck.
      const latestTerminalSession = a.sessions.find((s) =>
        TERMINAL_STATUSES.includes(s.status as (typeof TERMINAL_STATUSES)[number])
      )

      const opensInFuture = a.status === 'SCHEDULED' || (a.startTime ? now < a.startTime : false)
      const closed =
        a.status === 'ENDED' || a.status === 'CANCELLED' || (a.endTime ? now > a.endTime : false)
      const cancelled = a.status === 'CANCELLED'

      // A student who has used up every attempt has "completed" the test
      // for our purposes, whether that used-up attempt was a normal submit,
      // a timeout, or a disqualification. This is distinct from "closed"
      // (the window shut with no attempt made at all).
      const completed = attemptsRemaining === 0 && Boolean(latestTerminalSession)

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
        attemptsRemaining > 0 &&
        !inProgressSession &&
        !opensInFuture &&
        !closed &&
        !cancelled &&
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
        cancelled,
        completed,
        displayStatus,
        status: a.status,
        requireFaceVerify: a.requireFaceVerify,
        fullscreenRequired: a.fullscreenRequired,
        canStart,
        inProgressSessionId: inProgressSession?.id ?? null,
        // Frontend uses this to route "View Result" on a disabled/completed
        // card straight to the finished attempt, instead of only disabling
        // the Start button with no way forward.
        completedSessionId: latestTerminalSession?.id ?? null,
        completedSessionStatus: latestTerminalSession?.status ?? null,
        course: a.course
          ? {
              code: a.course.code,
              title: a.course.title,
              level: a.course.level?.name,
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
  start: async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user)

    const form = await request.formData()
    const assessmentId = form.get('assessmentId')?.toString()

    if (!assessmentId) {
      return fail(400, { startError: 'Missing test id.' })
    }

    const prisma = await getPrismaClient()
    const now = new Date()

    // ─── Get current active semester ────────────────────────────────────
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

    // ─── Verify student has approved registration ──────────────────────
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

    // ─── Check eligibility ──────────────────────────────────────────────
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

    // No enrollment, no assessment — this check is now unconditional
    // (previously gated on `assessment.requireFaceVerify`, which left a
    // gap: a student with zero face enrollment could still resume an
    // in-progress session below for any test that didn't specifically flag
    // requireFaceVerify, since the existingActive redirect ran regardless).
    // Enrollment is a platform-wide prerequisite for taking any test at
    // all, so this must run — and block — before that resume redirect,
    // not only when this particular assessment opts into live face
    // verification during the exam itself.
    if (!faceDescriptor) {
      return fail(400, {
        startError: 'You must enroll your face before taking any test.',
        needsFaceEnrollment: true,
      })
    }

    // Resume an attempt already in progress rather than starting a new one.
    const existingActive = assessment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
    )
    if (existingActive) {
      throw redirect(303, `/student/tests/${existingActive.id}`)
    }

    // Attempts exhausted: this test has already been written. Send the
    // student to their most recent finished attempt's result instead of
    // just failing with an error and leaving them nowhere to go.
    const attemptsUsed = assessment.sessions.length
    if (attemptsUsed >= assessment.maxAttempts) {
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