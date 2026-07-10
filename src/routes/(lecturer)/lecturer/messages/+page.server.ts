// src/routes/(lecturer)/lecturer/messages/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	// If no department ID, return error state
	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			conversations: [],
			students: [],
			stats: {
				total: 0,
				open: 0,
				resolved: 0,
				closed: 0,
			},
			error: 'No department assigned. Contact your HOD.'
		}
	}

	const prisma = await getPrismaClient()

	// Get conversations for this lecturer
	const conversations = await prisma.conversation.findMany({
		where: {
			assignedToId: user.id,
		},
		include: {
			student: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					matricNumber: true,
				},
			},
			messages: {
				orderBy: {
					createdAt: 'asc',
				},
			},
		},
		orderBy: {
			lastMessageAt: 'desc',
		},
	})

	// Get students in lecturer's department for new conversation
	const students = await prisma.student.findMany({
		where: {
			departmentId: user.departmentId,
			status: 'ACTIVE',
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			matricNumber: true,
		},
	})

	const openCount = conversations.filter(c => c.status === 'OPEN').length
	const resolvedCount = conversations.filter(c => c.status === 'RESOLVED').length
	const closedCount = conversations.filter(c => c.status === 'CLOSED').length

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		conversations: conversations.map(c => ({
			id: c.id,
			studentId: c.studentId,
			studentName: `${c.student.firstName} ${c.student.lastName}`,
			studentMatric: c.student.matricNumber,
			subject: c.subject,
			status: c.status,
			lastMessageAt: c.lastMessageAt,
			unreadCount: c.messages.filter(m => m.senderType === 'student' && !m.readAt).length,
			messages: c.messages.map(m => ({
				id: m.id,
				senderType: m.senderType,
				body: m.body,
				createdAt: m.createdAt,
				readAt: m.readAt,
			})),
		})),
		students: students.map(s => ({
			id: s.id,
			name: `${s.firstName} ${s.lastName}`,
			matricNumber: s.matricNumber,
		})),
		stats: {
			total: conversations.length,
			open: openCount,
			resolved: resolvedCount,
			closed: closedCount,
		},
	}
}