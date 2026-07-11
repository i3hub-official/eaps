// src/routes/student/courses/+page.server.ts
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

const MAX_EDITS = 3

type SemesterWindow = {
  regOpenAt: Date | null
  regCloseAt: Date | null
  registrationEnabled: boolean
}

type WindowState = {
  open: boolean
  reason: 'OPEN' | 'DISABLED' | 'NOT_YET_OPEN' | 'CLOSED'
}

function getRegistrationWindowState(semester: SemesterWindow): WindowState {
  if (!semester.registrationEnabled) return { open: false, reason: 'DISABLED' }
  const now = new Date()
  if (semester.regOpenAt && now < semester.regOpenAt) return { open: false, reason: 'NOT_YET_OPEN' }
  if (semester.regCloseAt && now > semester.regCloseAt) return { open: false, reason: 'CLOSED' }
  return { open: true, reason: 'OPEN' }
}

// Backfills AssessmentEligibility for a student against any currently
// open assessments on a given course. Needed because eligibility is
// seeded from registrants AT TEST-CREATION TIME (see the lecturer
// test-create action) — a student who registers for the course AFTER
// a test/exam/assignment was already published would otherwise be
// silently invisible to it despite holding a valid registration.
// skipDuplicates makes this safe to call on every approve/re-approve.
async function backfillAssessmentEligibility(
  prisma: Awaited<ReturnType<typeof getPrismaClient>>,
  courseId: string,
  studentId: string
) {
  const openAssessments = await prisma.assessment.findMany({
    where: {
      courseId,
      type: { in: ['TEST', 'EXAMINATION', 'ASSIGNMENT'] },
      status: { in: ['PUBLISHED', 'SCHEDULED', 'ACTIVE'] },
    },
    select: { id: true },
  })

  if (openAssessments.length === 0) return

  await prisma.assessmentEligibility.createMany({
    data: openAssessments.map((a) => ({ assessmentId: a.id, studentId })),
    skipDuplicates: true,
  })
}

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } })
  const semester = session
    ? await prisma.semester.findFirst({ where: { sessionId: session.id, isCurrent: true } })
    : null

  if (!session || !semester) {
    return {
      noActiveSession: true as const,
      session: null,
      semester: null,
      registrationWindowOpen: false,
      registrationWindowReason: 'CLOSED' as const,
      registrations: [],
      availableCourses: [],
      colleges: [],
      totalCreditUnits: 0,
    }
  }

  const windowState = getRegistrationWindowState(semester)

  const [registrations, allCourses, colleges] = await Promise.all([
    prisma.courseRegistration.findMany({
      where: {
        studentId: student.id,
        sessionId: session.id,
        semesterId: semester.id,
        status: { not: 'CANCELLED' },
      },
      include: { course: true },
      orderBy: { createdAt: 'asc' },
    }),

    windowState.open
      ? prisma.course.findMany({
          where: {
            status: 'ACTIVE',
            levelId: student.currentLevelId,
            offerings: { some: { semesterId: semester.id } },
          },
          include: { department: { include: { college: true } } },
          orderBy: [{ department: { collegeId: 'asc' } }, { code: 'asc' }],
        })
      : Promise.resolve([]),

    prisma.college.findMany({
      include: { departments: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const registeredCourseIds = new Set(registrations.map((r) => r.courseId))
  const availableCourses = allCourses.filter((c) => !registeredCourseIds.has(c.id))
  const totalCreditUnits = registrations.reduce((sum, r) => sum + r.course.creditUnits, 0)

  return {
    noActiveSession: false as const,
    session: { id: session.id, name: session.name },
    semester: {
      id: semester.id,
      type: semester.type,
      regOpenAt: semester.regOpenAt,
      regCloseAt: semester.regCloseAt,
    },
    registrationWindowOpen: windowState.open,
    registrationWindowReason: windowState.reason,
    registrations: registrations.map((r) => ({
      id: r.id,
      status: r.status,
      editCount: r.editCount,
      course: {
        id: r.course.id,
        code: r.course.code,
        title: r.course.title,
        creditUnits: r.course.creditUnits,
        type: r.course.type,
      },
    })),
    availableCourses: availableCourses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      creditUnits: c.creditUnits,
      type: c.type,
      departmentId: c.departmentId,
      departmentName: c.department.name,
      collegeId: c.department.collegeId,
      collegeName: c.department.college.name,
      isRecommended: c.departmentId === student.departmentId,
    })),
    colleges: colleges.map((col) => ({
      id: col.id,
      name: col.name,
      departments: col.departments.map((d) => ({ id: d.id, name: d.name })),
    })),
    totalCreditUnits,
  }
}

export const actions: Actions = {
  register: async ({ request, locals }) => {
    const student = await requireStudent(locals.user)
    const form = await request.formData()
    const courseIds = form.getAll('courseIds').map(String).filter(Boolean)

    if (courseIds.length === 0)
      return fail(400, { registerError: 'Select at least one course to register.' })

    const prisma = await getPrismaClient()

    const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } })
    const semester = session
      ? await prisma.semester.findFirst({ where: { sessionId: session.id, isCurrent: true } })
      : null

    if (!session || !semester)
      return fail(400, { registerError: 'There is no active registration period right now.' })

    const windowState = getRegistrationWindowState(semester)
    if (!windowState.open) {
      const message =
        windowState.reason === 'DISABLED'
          ? 'Registration has been temporarily closed by the exam office. Please check back later.'
          : windowState.reason === 'NOT_YET_OPEN'
            ? 'Course registration has not opened yet.'
            : 'Course registration has closed for this semester.'
      return fail(400, { registerError: message })
    }

    const eligibleCourses = await prisma.course.findMany({
      where: {
        id: { in: courseIds },
        status: 'ACTIVE',
        levelId: student.currentLevelId,
        offerings: { some: { semesterId: semester.id } },
      },
    })

    if (eligibleCourses.length === 0)
      return fail(400, { registerError: 'None of the selected courses are available.' })

    const existing = await prisma.courseRegistration.findMany({
      where: {
        studentId: student.id,
        sessionId: session.id,
        semesterId: semester.id,
        courseId: { in: eligibleCourses.map((c) => c.id) },
      },
    })
    const existingByCourseId = new Map(existing.map((r) => [r.courseId, r]))

    let succeededCount = 0
    let alreadyActiveCount = 0
    let editLimitCount = 0

    const now = new Date()

    for (const course of eligibleCourses) {
      const existingReg = existingByCourseId.get(course.id)

      if (!existingReg) {
        await prisma.courseRegistration.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            sessionId: session.id,
            semesterId: semester.id,
            levelId: student.currentLevelId,
            type: 'NORMAL',
            status: 'APPROVED',
            approvedAt: now,
          },
        })
        // New APPROVED registration — catch up on any already-published
        // assessments for this course so the student isn't invisible to them.
        await backfillAssessmentEligibility(prisma, course.id, student.id)
        succeededCount++
        continue
      }

      if (existingReg.status === 'CANCELLED' || existingReg.status === 'REJECTED') {
        if (existingReg.editCount >= MAX_EDITS) {
          editLimitCount++
          continue
        }
        await prisma.courseRegistration.update({
          where: { id: existingReg.id },
          data: {
            status: 'APPROVED',
            approvedAt: now,
            rejectedAt: null,
            rejectedNote: null,
            editCount: { increment: 1 },
          },
        })
        // Re-approved registration — same backfill applies.
        await backfillAssessmentEligibility(prisma, course.id, student.id)
        succeededCount++
        continue
      }

      // APPROVED or PENDING — already active
      alreadyActiveCount++
    }

    if (succeededCount === 0) {
      if (editLimitCount > 0)
        return fail(400, {
          registerError: `Reached the maximum of ${MAX_EDITS} edits for ${editLimitCount} course${editLimitCount > 1 ? 's' : ''}. Contact your exam officer.`,
        })
      return fail(400, { registerError: 'Those courses are already registered.' })
    }

    const parts = [`${succeededCount} course${succeededCount > 1 ? 's' : ''} registered.`]
    if (alreadyActiveCount > 0) parts.push(`${alreadyActiveCount} already registered.`)
    if (editLimitCount > 0) parts.push(`${editLimitCount} could not be re-added (edit limit reached).`)

    return { registerSuccess: true, registerMessage: parts.join(' ') }
  },

 drop: async ({ request, locals }) => {
    const student = await requireStudent(locals.user)
    const form = await request.formData()
    const registrationId = form.get('registrationId')?.toString() ?? ''

    if (!registrationId) return fail(400, { dropError: 'Missing registration id.' })

    const prisma = await getPrismaClient()

    const registration = await prisma.courseRegistration.findUnique({
      where: { id: registrationId },
      include: { semester: true },
    })

    if (!registration || registration.studentId !== student.id)
      return fail(404, { dropError: 'Registration not found.' })

    if (registration.status === 'CANCELLED')
      return fail(400, { dropError: 'This course has already been dropped.' })

    const windowState = getRegistrationWindowState(registration.semester)
    if (!windowState.open) {
      const message =
        windowState.reason === 'DISABLED'
          ? 'Registration has been temporarily closed by the exam office. Contact them to drop this course.'
          : 'The registration window for this semester has closed.'
      return fail(400, { dropError: message })
    }

    if (registration.editCount >= MAX_EDITS)
      return fail(400, {
        dropError: `This course has reached the maximum of ${MAX_EDITS} edits. Contact your exam officer to drop it.`,
      })

    // ── Block drop if the student has any submitted assessment work ────
    // A SUBMITTED/TIMED_OUT/DISQUALIFIED session (or one with a result)
    // is a real academic record. Dropping the course afterward would
    // orphan that record against a registration that no longer exists,
    // corrupting transcripts. PENDING/IN_PROGRESS/PAUSED sessions don't
    // block — an abandoned/unstarted attempt isn't a submitted record.
    const submittedSession = await prisma.assessmentSession.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'] },
        assessment: { courseId: registration.courseId },
      },
      include: {
        assessment: { select: { title: true, type: true } },
      },
    })

    if (submittedSession) {
      return fail(400, {
        dropError: `You cannot drop this course — you have already submitted "${submittedSession.assessment.title}" (${submittedSession.assessment.type.toLowerCase()}). Contact your exam officer if you believe this is an error.`,
      })
    }

    if (registration.status === 'PENDING') {
      await prisma.courseRegistration.delete({ where: { id: registrationId } })
    } else {
      await prisma.courseRegistration.update({
        where: { id: registrationId },
        data: { status: 'CANCELLED', editCount: { increment: 1 } },
      })
    }

    return { dropSuccess: true, dropMessage: 'Course dropped.' }
  },
}