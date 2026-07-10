// src/routes/student/notifications/+page.server.ts
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireStudent } from '$lib/server/auth/guards'

export const load: PageServerLoad = async ({ locals }) => {
  const student = await requireStudent(locals.user)
  const prisma = await getPrismaClient()

  const notifications = await prisma.notification.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      readAt: n.readAt,
      link: n.link,
      createdAt: n.createdAt,
    })),
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }
}

export const actions: Actions = {
  markRead: async ({ request, locals }) => {
    const student = await requireStudent(locals.user)

    const form = await request.formData()
    const notificationId = form.get('notificationId')?.toString()
    if (!notificationId) {
      return fail(400, { error: 'Missing notification id.' })
    }

    const prisma = await getPrismaClient()

    // updateMany here (not update) so ownership is actually enforced in
    // the where clause — a bare update() with a non-unique extra filter
    // silently ignores it and would let a student mark anyone's notification.
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, studentId: student.id },
      data: { isRead: true, readAt: new Date() },
    })

    if (result.count === 0) {
      return fail(404, { error: 'Notification not found.' })
    }

    return { success: true }
  },

  markAllRead: async ({ locals }) => {
    const student = await requireStudent(locals.user)
    const prisma = await getPrismaClient()

    await prisma.notification.updateMany({
      where: { studentId: student.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return { success: true }
  },
}