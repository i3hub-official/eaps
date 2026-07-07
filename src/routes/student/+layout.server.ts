// src/routes/student/+layout.server.ts
// Shared layout load — runs on every student route.
// Attaches student + unread notification count to all pages.

import type { LayoutServerLoad } from './$types'
import { requireStudent } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: LayoutServerLoad = async (event) => {
  const { student } = await requireStudent(event)
  const prisma = await getPrismaClient()

  const unreadCount = await prisma.notification.count({
    where: { studentId: student.id, isRead: false },
  })

  return {
    student: {
      id:             student.id,
      firstName:      student.firstName,
      lastName:       student.lastName,
      matricNumber:   student.matricNumber,
      email:          student.email,
      avatar:         student.avatar,
      faceEnrolledAt: student.faceEnrolledAt?.toISOString() ?? null,
      department:     student.department.name,
      programme:      student.programme?.name ?? null,
      level:          student.currentLevel.name,
      status:         student.status,
    },
    unreadCount,
  }
}
