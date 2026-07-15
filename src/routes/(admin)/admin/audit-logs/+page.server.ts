// src/routes/(admin)/admin/audit-logs/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

// Only users with these roles can view audit logs
const CAN_VIEW_AUDIT_LOGS: StaffRole[] = [
	'SUPER_ADMIN',
	'VC',
	'DVC',
	'REGISTRAR',
	'UNIVERSITY_EXAM_OFFICER'
]

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	// Check permission
	if (!CAN_VIEW_AUDIT_LOGS.includes(user.primaryRole)) {
		return {
			error: 'You do not have permission to view audit logs.',
			logs: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, byAction: {}, byEntity: {}, recentCount: 0 },
			filters: { action: null, entity: null, actor: null, dateFrom: null, dateTo: null }
		}
	}

	const prisma = await getPrismaClient()

	// ─── Get filter params ──────────────────────────────────────────────
	const page = parseInt(url.searchParams.get('page') || '1')
	const actionFilter = url.searchParams.get('action')
	const entityFilter = url.searchParams.get('entity')
	const actorFilter = url.searchParams.get('actor')
	const dateFrom = url.searchParams.get('dateFrom')
	const dateTo = url.searchParams.get('dateTo')

	const skip = (page - 1) * PAGE_SIZE

	// ─── Build where clause ─────────────────────────────────────────────
	const where: any = {}

	if (actionFilter && actionFilter !== 'all') {
		where.action = actionFilter
	}
	if (entityFilter && entityFilter !== 'all') {
		where.entity = entityFilter
	}
	if (dateFrom) {
		where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) }
	}
	if (dateTo) {
		where.createdAt = { ...where.createdAt, lte: new Date(dateTo) }
	}
	if (actorFilter && actorFilter !== 'all') {
		where.OR = [
			{ staffId: actorFilter },
			{ studentId: actorFilter }
		]
	}

	// ─── Fetch logs ─────────────────────────────────────────────────────
	const [logs, totalCount, actionCounts, entityCounts, recentCount] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			include: {
				staff: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						primaryRole: true,
					}
				},
				student: {
					select: {
						id: true,
						matricNumber: true,
						firstName: true,
						lastName: true,
						email: true,
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.auditLog.count({ where }),
		prisma.auditLog.groupBy({
			by: ['action'],
			_count: { action: true },
			orderBy: { _count: { action: 'desc' } },
			take: 10,
		}),
		prisma.auditLog.groupBy({
			by: ['entity'],
			_count: { entity: true },
			orderBy: { _count: { entity: 'desc' } },
			take: 10,
		}),
		prisma.auditLog.count({
			where: {
				createdAt: {
					gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
				}
			}
		})
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	// ─── Get unique actors for filter ──────────────────────────────────
	const actors = await prisma.auditLog.findMany({
		where: {
			OR: [
				{ staffId: { not: null } },
				{ studentId: { not: null } }
			]
		},
		select: {
			staffId: true,
			studentId: true,
			staff: {
				select: { firstName: true, lastName: true, email: true }
			},
			student: {
				select: { firstName: true, lastName: true, email: true, matricNumber: true }
			}
		},
		distinct: ['staffId', 'studentId'],
		take: 50,
	})

	// ─── Process logs for display ──────────────────────────────────────
	const processedLogs = await Promise.all(logs.map(async (log) => {
		let actorName = 'System'
		let actorType = 'system'
		let actorEmail = null

		if (log.staff) {
			try {
				const firstName = revealName(log.staff.firstName)
				const lastName = revealName(log.staff.lastName)
				actorName = `${firstName} ${lastName}`
				actorEmail = log.staff.email
				actorType = 'staff'
			} catch (e) {
				actorName = 'Staff (Decryption Error)'
			}
		} else if (log.student) {
			try {
				const firstName = revealName(log.student.firstName)
				const lastName = revealName(log.student.lastName)
				actorName = `${firstName} ${lastName}`
				actorEmail = log.student.email
				actorType = 'student'
			} catch (e) {
				actorName = 'Student (Decryption Error)'
			}
		}

		return {
			id: log.id,
			action: log.action,
			entity: log.entity,
			entityId: log.entityId,
			actorName,
			actorType,
			actorEmail,
			beforeData: log.beforeData,
			afterData: log.afterData,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			createdAt: log.createdAt,
		}
	}))

	// ─── Build actor options for filter ────────────────────────────────
	const actorOptions = actors.map((a) => {
		let name = 'Unknown'
		let id = a.staffId || a.studentId
		let type = a.staffId ? 'staff' : 'student'

		if (a.staff) {
			try {
				const firstName = revealName(a.staff.firstName)
				const lastName = revealName(a.staff.lastName)
				name = `${firstName} ${lastName}`
			} catch (e) {
				name = 'Staff (Decryption Error)'
			}
		} else if (a.student) {
			try {
				const firstName = revealName(a.student.firstName)
				const lastName = revealName(a.student.lastName)
				name = `${firstName} ${lastName}`
			} catch (e) {
				name = 'Student (Decryption Error)'
			}
		}

		return {
			id,
			name,
			type,
			email: a.staff?.email || a.student?.email || null,
		}
	}).filter(a => a.id)

	// ─── Build stats ────────────────────────────────────────────────────
	const stats = {
		total: totalCount,
		byAction: actionCounts.reduce((acc, curr) => {
			acc[curr.action] = curr._count.action
			return acc
		}, {} as Record<string, number>),
		byEntity: entityCounts.reduce((acc, curr) => {
			acc[curr.entity] = curr._count.entity
			return acc
		}, {} as Record<string, number>),
		recentCount,
	}

	return {
		logs: processedLogs,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		stats,
		filters: {
			action: actionFilter || 'all',
			entity: entityFilter || 'all',
			actor: actorFilter || 'all',
			dateFrom: dateFrom || null,
			dateTo: dateTo || null,
		},
		actorOptions,
		availableActions: [
			'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
			'VIEW', 'EXPORT', 'APPROVE', 'REJECT', 'PUBLISH',
			'UNPUBLISH', 'GRADE', 'RELEASE', 'SUSPEND', 'ACTIVATE',
			'RESET_PASSWORD', 'VERIFY', 'INVITE', 'REVOKE'
		],
		availableEntities: [
			'User', 'Student', 'Staff', 'Course', 'Assessment',
			'Question', 'Result', 'Registration', 'Session', 'Notification',
			'Invitation', 'FaceData', 'Attendance', 'Grade', 'Transcript'
		],
	}
}