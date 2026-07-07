// src/routes/(student)/verify/+page.server.ts

import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async (event) => {
  // requireStudent takes the full RequestEvent, not locals.user
  const { student } = await requireStudent(event)

  const url = event.url
  const examId  = url.searchParams.get('examId')
  const expired = url.searchParams.get('expired') === '1'
  const returnTo = url.searchParams.get('returnTo') ?? null

  // If no examId, just a standalone face verify (e.g. from enroll redirect)
  if (!examId) {
    return {
      user:     { id: student.id, name: `${student.firstName} ${student.lastName}` },
      exam:     null,
      expired,
      returnTo,
    }
  }

  const prisma = await getPrismaClient()

  // Verify the assessment exists, is active, and the student is registered
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: examId,
      status: { in: ['ACTIVE', 'SCHEDULED'] },
      course: {
        registrations: {
          some: {
            studentId: student.id,
            status: { notIn: ['REJECTED', 'CANCELLED'] },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      durationMinutes: true,
      requireFaceVerify: true,
      course: { select: { code: true, title: true } },
    },
  })

  if (!assessment) {
    throw error(404, 'Exam not found or you are not registered for this course.')
  }

  // Check for an existing in-progress session (resume case)
  const existingSession = await prisma.assessmentSession.findFirst({
    where: {
      assessmentId: assessment.id,
      studentId: student.id,
      status: { in: ['IN_PROGRESS', 'PAUSED', 'PENDING'] },
    },
    select: { id: true, status: true },
  })

  return {
    user: {
      id:   student.id,
      name: `${student.firstName} ${student.lastName}`,
    },
    exam: {
      id:                 assessment.id,
      title:              assessment.title,
      type:               assessment.type,
      courseCode:         assessment.course.code,
      durationMinutes:    assessment.durationMinutes,
      hasExistingSession: !!existingSession && existingSession.status !== 'PENDING',
      sessionId:          existingSession?.id ?? null,
    },
    expired,
    returnTo,
  }
}