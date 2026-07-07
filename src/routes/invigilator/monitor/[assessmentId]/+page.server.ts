// src/routes/invigilator/monitor/[assessmentId]/+page.server.ts

import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { requireInvigilator } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { STAFF_COOKIE } from '$lib/server/auth'

export const load: PageServerLoad = async (event) => {
  const { staff } = await requireInvigilator(event)
  const { assessmentId } = event.params

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: { select: { code: true, title: true } },
    },
  })

  if (!assessment) throw error(404, 'Assessment not found')

  if (!['ACTIVE', 'ENDED'].includes(assessment.status)) {
    throw error(400, 'This assessment is not currently active')
  }

  // Check assignment (admins bypass)
  const adminRoles = ['SUPER_ADMIN', 'UNIVERSITY_EXAM_OFFICER', 'HOD']
  if (!adminRoles.includes(staff.primaryRole)) {
    const assigned = await db.assessmentInvigilator.findFirst({
      where: { assessmentId, staffId: staff.id },
    })
    if (!assigned) throw error(403, 'You are not assigned to invigilate this examination')
  }

  // Pass the session token to the client so the WS can authenticate
  // (safe — it's the same token already in the httpOnly cookie, just passed
  // as page data for the WS handshake which can't read cookies directly)
  const staffToken = event.cookies.get(STAFF_COOKIE) ?? ''

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      course: assessment.course,
      durationMinutes: assessment.durationMinutes,
      startTime: assessment.startTime?.toISOString() ?? null,
      endTime: assessment.endTime?.toISOString() ?? null,
    },
    staffToken,
  }
}