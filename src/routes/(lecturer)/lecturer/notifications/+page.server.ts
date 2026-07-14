// src/routes/(lecturer)/lecturer/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { fail } from '@sveltejs/kit'

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

export const actions: Actions = {
	// ─── Mark single notification as read ──────────────────────────────
	markRead: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const notificationId = formData.get('notificationId')?.toString()

		if (!notificationId) {
			return fail(400, { error: 'Notification ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			await prisma.notification.update({
				where: {
					id: notificationId,
					staffId: user.id, // Ensure ownership
				},
				data: {
					isRead: true,
					readAt: new Date(),
				},
			})

			return { success: true }
		} catch (error) {
			console.error('Failed to mark notification as read:', error)
			return fail(500, { error: 'Failed to mark notification as read' })
		}
	},

	// ─── Mark all notifications as read ────────────────────────────────
	markAllRead: async ({ locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		try {
			await prisma.notification.updateMany({
				where: {
					staffId: user.id,
					isRead: false,
				},
				data: {
					isRead: true,
					readAt: new Date(),
				},
			})

			return { success: true }
		} catch (error) {
			console.error('Failed to mark all notifications as read:', error)
			return fail(500, { error: 'Failed to mark all notifications as read' })
		}
	},

	// ─── Mark multiple notifications as read ──────────────────────────
	markBulkRead: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const notificationIdsJson = formData.get('notificationIds')?.toString()

		if (!notificationIdsJson) {
			return fail(400, { error: 'Notification IDs are required' })
		}

		let notificationIds: string[]
		try {
			notificationIds = JSON.parse(notificationIdsJson)
		} catch {
			return fail(400, { error: 'Invalid notification IDs format' })
		}

		if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
			return fail(400, { error: 'At least one notification ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			await prisma.notification.updateMany({
				where: {
					id: { in: notificationIds },
					staffId: user.id, // Ensure ownership
					isRead: false,
				},
				data: {
					isRead: true,
					readAt: new Date(),
				},
			})

			return { success: true, count: notificationIds.length }
		} catch (error) {
			console.error('Failed to mark notifications as read:', error)
			return fail(500, { error: 'Failed to mark notifications as read' })
		}
	},

	// ─── Delete multiple notifications ────────────────────────────────
	deleteBulk: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const notificationIdsJson = formData.get('notificationIds')?.toString()

		if (!notificationIdsJson) {
			return fail(400, { error: 'Notification IDs are required' })
		}

		let notificationIds: string[]
		try {
			notificationIds = JSON.parse(notificationIdsJson)
		} catch {
			return fail(400, { error: 'Invalid notification IDs format' })
		}

		if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
			return fail(400, { error: 'At least one notification ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			const result = await prisma.notification.deleteMany({
				where: {
					id: { in: notificationIds },
					staffId: user.id, // Ensure ownership
				},
			})

			return { success: true, count: result.count }
		} catch (error) {
			console.error('Failed to delete notifications:', error)
			return fail(500, { error: 'Failed to delete notifications' })
		}
	},

	// ─── Archive notifications ──────────────────────────────────────────
	archiveBulk: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const notificationIdsJson = formData.get('notificationIds')?.toString()

		if (!notificationIdsJson) {
			return fail(400, { error: 'Notification IDs are required' })
		}

		let notificationIds: string[]
		try {
			notificationIds = JSON.parse(notificationIdsJson)
		} catch {
			return fail(400, { error: 'Invalid notification IDs format' })
		}

		if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
			return fail(400, { error: 'At least one notification ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			// Note: You'll need to add an `isArchived` field to your Notification model
			await prisma.notification.updateMany({
				where: {
					id: { in: notificationIds },
					staffId: user.id,
				},
				data: {
					isArchived: true,
					archivedAt: new Date(),
				},
			})

			return { success: true, count: notificationIds.length }
		} catch (error) {
			console.error('Failed to archive notifications:', error)
			return fail(500, { error: 'Failed to archive notifications' })
		}
	},
}