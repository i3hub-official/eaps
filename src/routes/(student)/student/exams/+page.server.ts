// src/routes/student/exams/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const now = new Date()

  const [assessments, faceDescriptor, approvedRegistrations] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        type: 'EXAMINATION',
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
    // Exams are tied to a specific course — a student must have an APPROVED
    // registration for that course to be allowed to sit its exam.
    prisma.courseRegistration.findMany({
      where: { studentId: student.id, status: 'APPROVED' },
      select: { courseId: true },
    }),
  ])

  const faceEnrolled = Boolean(faceDescriptor)
  const registeredCourseIds = new Set(approvedRegistrations.map((r) => r.courseId))

  return {
    faceEnrolled,
    exams: assessments.map((a) => {
      const attemptsUsed = a.sessions.length
      const attemptsRemaining = Math.max(a.maxAttempts - attemptsUsed, 0)
      const latestSession = a.sessions[0] ?? null
      const inProgressSession = a.sessions.find(
        (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
      )

      const opensInFuture = a.startTime ? now < a.startTime : false
      const closed = a.endTime ? now > a.endTime : false
      const isRegistered = registeredCourseIds.has(a.courseId)

      const canStart =
        faceEnrolled &&
        isRegistered &&
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
        requireLiveness: a.requireLiveness,
        fullscreenRequired: a.fullscreenRequired,
        offlineEnabled: a.offlineEnabled,
        paperVariants: a.paperVariants,
        isRegistered,
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
      return fail(400, { startError: 'Missing exam id.' })
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

    if (!assessment || assessment.type !== 'EXAMINATION') {
      return fail(404, { startError: 'Exam not found.' })
    }
    if (assessment.status !== 'PUBLISHED' && assessment.status !== 'ACTIVE') {
      return fail(400, { startError: 'This exam is not currently open.' })
    }

    const eligible = assessment.eligibility.some(
      (e) =>
        e.departmentId === student.departmentId ||
        e.levelId === student.currentLevelId ||
        e.studentId === student.id,
    )
    if (!eligible) {
      return fail(403, { startError: 'You are not eligible for this exam.' })
    }

    // Never trust the client — re-verify the student holds an APPROVED
    // registration for this exam's course before creating a session.
    const courseRegistration = await prisma.courseRegistration.findFirst({
      where: {
        studentId: student.id,
        courseId: assessment.courseId,
        status: 'APPROVED',
      },
    })
    if (!courseRegistration) {
      return fail(403, {
        startError: 'You must have an approved course registration to sit this exam.',
      })
    }

    const now = new Date()
    if (assessment.startTime && now < assessment.startTime) {
      return fail(400, { startError: 'This exam has not opened yet.' })
    }
    if (assessment.endTime && now > assessment.endTime) {
      return fail(400, { startError: 'This exam has closed.' })
    }

    if (assessment.requireFaceVerify && !faceDescriptor) {
      return fail(400, {
        startError: 'You must enroll your face before taking this exam.',
        needsFaceEnrollment: true,
      })
    }

    const existingActive = assessment.sessions.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    )
    if (existingActive) {
      throw redirect(303, `/student/exams/${existingActive.id}`)
    }

    const attemptsUsed = assessment.sessions.length
    if (attemptsUsed >= assessment.maxAttempts) {
      return fail(400, { startError: 'You have used all attempts for this exam.' })
    }

    // Assign a paper variant (A/B/C...) round-robin by attempt count when
    // the assessment has multiple variants, otherwise always "A".
    const variantLetters = ['A', 'B', 'C', 'D', 'E']
    const paperVariant =
      assessment.paperVariants > 1
        ? variantLetters[attemptsUsed % Math.min(assessment.paperVariants, variantLetters.length)]
        : 'A'

    const session = await prisma.assessmentSession.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        attemptNumber: attemptsUsed + 1,
        status: 'PENDING',
        paperVariant,
        isOffline: assessment.offlineEnabled,
        expiresAt: new Date(Date.now() + assessment.durationMinutes * 60 * 1000),
      },
    })

    // NOTE: /student/exams/[sessionId] doesn't exist yet. It needs to
    // handle: device check (mic, camera, others) + liveness + face verification in the lobby BEFORE the timer starts,
    // fullscreen lock enforcement, violation logging (webcam/tab-switch/
    // devtools), offline sync if offlineEnabled, and final submission.
    // This redirect will 404 until that route is built.
    throw redirect(303, `/student/exams/${session.id}`)
  },
}