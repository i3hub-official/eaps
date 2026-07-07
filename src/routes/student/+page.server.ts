// src/routes/student/+page.server.ts

import type { PageServerLoad } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async (event) => {
  const { student } = await requireStudent(event)
  const prisma = await getPrismaClient()

  // Current academic session
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      semesters: { where: { isCurrent: true }, take: 1 },
    },
  })

  const semesterId = session?.semesters[0]?.id

  // Registered courses this semester
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: student.id,
      ...(semesterId ? { semesterId } : {}),
      status: { notIn: ['CANCELLED'] },
    },
    include: {
      course: { select: { code: true, title: true, creditUnits: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  // Active / upcoming assessments for registered courses
  const courseIds = registrations.map(r => r.courseId)
  const assessments = courseIds.length > 0
    ? await prisma.assessment.findMany({
        where: {
          courseId: { in: courseIds },
          status:   { in: ['ACTIVE', 'SCHEDULED'] },
        },
        include: {
          course: { select: { code: true, title: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 5,
      })
    : []

  // Recent results
  const results = await prisma.assessmentResult.findMany({
    where: { studentId: student.id, isReleased: true },
    include: {
      assessment: {
        include: { course: { select: { code: true, title: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  // Latest notifications (unread first)
  const notifications = await prisma.notification.findMany({
    where:   { studentId: student.id },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 5,
  })

  // GPA from transcript
  const transcript = await prisma.transcriptEntry.findMany({
    where: { studentId: student.id, isFinalized: true },
    select: { gradePoints: true, creditUnits: true },
  })

  let cgpa = 0
  if (transcript.length > 0) {
    const totalPoints = transcript.reduce((s, t) => s + (Number(t.gradePoints) * (t.creditUnits ?? 0)), 0)
    const totalUnits  = transcript.reduce((s, t) => s + (t.creditUnits ?? 0), 0)
    cgpa = totalUnits > 0 ? Math.round((totalPoints / totalUnits) * 100) / 100 : 0
  }

  return {
    session: session ? { name: session.name, semester: session.semesters[0]?.type ?? null } : null,
    registrations: registrations.map(r => ({
      id:     r.id,
      status: r.status,
      course: r.course,
    })),
    assessments: assessments.map(a => ({
      id:           a.id,
      title:        a.title,
      type:         a.type,
      status:       a.status,
      startTime:    a.startTime?.toISOString() ?? null,
      endTime:      a.endTime?.toISOString()   ?? null,
      totalMarks:   Number(a.totalMarks),
      course:       a.course,
    })),
    results: results.map(r => ({
      id:           r.id,
      percentage:   Number(r.percentage),
      grade:        r.grade,
      passed:       r.passed,
      marksObtained: Number(r.marksObtained),
      totalMarks:   Number(r.totalMarks),
      createdAt:    r.createdAt.toISOString(),
      assessment:   { type: r.assessment.type, course: r.assessment.course },
    })),
    notifications: notifications.map(n => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      isRead:    n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    cgpa,
    totalCourses: registrations.length,
  }
}