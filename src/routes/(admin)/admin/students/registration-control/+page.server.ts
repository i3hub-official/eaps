import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'

// Everyone except LECTURER and INVIGILATOR can manage the registration window.
// Adjust this list if your intended hierarchy differs.
const ROLES_ABOVE_LECTURER = [
  'SUPER_ADMIN',
  'VC',
  'DVC',
  'REGISTRAR',
  'UNIVERSITY_EXAM_OFFICER',
  'UNIVERSITY_COURSE_COORDINATOR',
  'DEAN',
  'HOD',
  'COLLEGE_EXAM_OFFICER',
  'COLLEGE_COORDINATOR',
  'DEPARTMENT_EXAM_OFFICER',
  'DEPARTMENT_COORDINATOR',
]

function requireRegistrationManager(user: any) {
  if (!user) throw redirect(303, '/staff/login')
  if (!ROLES_ABOVE_LECTURER.includes(user.primaryRole)) {
    throw error(403, 'You do not have permission to manage course registration.')
  }
  return user
}

export const load: PageServerLoad = async ({ locals }) => {
  const staff = requireRegistrationManager(locals.user)
  const prisma = await getPrismaClient()

  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } })

  if (!session) {
    return {
      user: { id: staff.id, firstName: staff.firstName, lastName: staff.lastName },
      session: null,
      semesters: [],
      error: 'No active academic session. Set one before managing registration.',
    }
  }

  const semesters = await prisma.semester.findMany({
    where: { sessionId: session.id },
    orderBy: { startDate: 'asc' },
  })

  return {
    user: { id: staff.id, firstName: staff.firstName, lastName: staff.lastName },
    session: { id: session.id, name: session.name },
    semesters: semesters.map((s) => ({
      id: s.id,
      type: s.type,
      isCurrent: s.isCurrent,
      registrationEnabled: s.registrationEnabled,
      regOpenAt: s.regOpenAt,
      regCloseAt: s.regCloseAt,
    })),
    error: null,
  }
}

export const actions: Actions = {
  toggle: async ({ request, locals }) => {
    requireRegistrationManager(locals.user)
    const prisma = await getPrismaClient()

    const form = await request.formData()
    const semesterId = form.get('semesterId')?.toString() ?? ''
    const enabled = form.get('enabled')?.toString() === 'true'

    if (!semesterId) return fail(400, { error: 'Missing semester id.' })

    const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
    if (!semester) return fail(404, { error: 'Semester not found.' })

    await prisma.semester.update({
      where: { id: semesterId },
      data: { registrationEnabled: enabled },
    })

    return { success: true, message: enabled ? 'Registration enabled.' : 'Registration disabled.' }
  },

  updateWindow: async ({ request, locals }) => {
    requireRegistrationManager(locals.user)
    const prisma = await getPrismaClient()

    const form = await request.formData()
    const semesterId = form.get('semesterId')?.toString() ?? ''
    const regOpenAtRaw = form.get('regOpenAt')?.toString() ?? ''
    const regCloseAtRaw = form.get('regCloseAt')?.toString() ?? ''

    if (!semesterId) return fail(400, { error: 'Missing semester id.' })

    const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
    if (!semester) return fail(404, { error: 'Semester not found.' })

    const regOpenAt = regOpenAtRaw ? new Date(regOpenAtRaw) : null
    const regCloseAt = regCloseAtRaw ? new Date(regCloseAtRaw) : null

    if (regOpenAt && regCloseAt && regCloseAt <= regOpenAt) {
      return fail(400, { error: 'Close time must be after open time.' })
    }

    await prisma.semester.update({
      where: { id: semesterId },
      data: { regOpenAt, regCloseAt },
    })

    return { success: true, message: 'Registration window updated.' }
  },
}