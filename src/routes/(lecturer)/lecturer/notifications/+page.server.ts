// src/routes/(lecturer)/lecturer/notifications/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	const prisma = await getPrismaClient()

	// Get notifications for this staff member
	const notifications = await prisma.notification.findMany({
		where: {
			staffId: user.id,
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	const unreadCount = notifications.filter(n => !n.isRead).length
	const readCount = notifications.filter(n => n.isRead).length

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		notifications: notifications.map(n => ({
			id: n.id,
			type: n.type,
			title: n.title,
			body: n.body,
			isRead: n.isRead,
			createdAt: n.createdAt,
			link: n.link,
		})),
		stats: {
			total: notifications.length,
			unread: unreadCount,
			read: readCount,
		},
	}
}