import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireExamOfficer } from '$lib/server/auth/guards'

export const load: PageServerLoad = async ({ locals }) => {
  await requireExamOfficer(locals.user)

  const prisma = await getPrismaClient()

  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } })
  const semester = session
    ? await prisma.semester.findFirst({ where: { sessionId: session.id, isCurrent: true } })
    : null

  if (!session || !semester) {
    return { noActiveSession: true as const, session: null, semester: null }
  }

  return {
    noActiveSession: false as const,
    session: { id: session.id, name: session.name },
    semester: {
      id: semester.id,
      type: semester.type,
      regOpenAt: semester.regOpenAt,
      regCloseAt: semester.regCloseAt,
      registrationEnabled: semester.registrationEnabled,
    },
  }
}

export const actions: Actions = {
  toggle: async ({ request, locals }) => {
    await requireExamOfficer(locals.user)

    const form = await request.formData()
    const semesterId = form.get('semesterId')?.toString()
    const enabled = form.get('enabled')?.toString() === 'true'

    if (!semesterId) {
      return fail(400, { toggleError: 'Missing semester id.' })
    }

    const prisma = await getPrismaClient()

    // Guard against a stale form acting on a semester that's no longer current.
    const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
    if (!semester) {
      return fail(404, { toggleError: 'Semester not found.' })
    }

    await prisma.semester.update({
      where: { id: semesterId },
      data: { registrationEnabled: enabled },
    })

    return {
      toggleSuccess: true,
      toggleMessage: enabled
        ? 'Registration has been opened for students.'
        : 'Registration has been closed for students.',
    }
  },
}