// src/routes/student/attendance/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

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
      courses: [],
    }
  }

  // Only courses the student is APPROVED for this semester have an
  // attendance record worth showing — a pending/rejected registration
  // never had a seat in the class to be marked present for.
  const registrations = await prisma.courseRegistration.findMany({
    where: {
      studentId: student.id,
      sessionId: session.id,
      semesterId: semester.id,
      status: 'APPROVED',
    },
    include: { course: true },
  })

  const courseIds = registrations.map((r) => r.courseId)

  const offerings = await prisma.courseOffering.findMany({
    where: {
      semesterId: semester.id,
      courseId: { in: courseIds },
    },
    include: {
      course: true,
      attendanceSessions: {
        include: {
          records: {
            where: { studentId: student.id },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  })

  const courses = offerings.map((offering) => {
    const totalSessions = offering.attendanceSessions.length
    const records = offering.attendanceSessions.map((as) => {
      const record = as.records[0] ?? null
      return {
        attendanceSessionId: as.id,
        title: as.title,
        date: as.date,
        status: record?.status ?? null, // null = not yet marked at all
        note: record?.note ?? null,
      }
    })

    const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
    const attendancePercent =
      totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null

    return {
      courseId: offering.courseId,
      courseCode: offering.course.code,
      courseTitle: offering.course.title,
      totalSessions,
      presentCount,
      attendancePercent,
      records,
    }
  })

  return {
    noActiveSession: false as const,
    session: { id: session.id, name: session.name },
    semester: { id: semester.id, type: semester.type },
    courses,
  }
}