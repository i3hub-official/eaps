// src/routes/(admin)/admin/system-logs/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

const PAGE_SIZE = 50

// Only SUPER_ADMIN can view system logs
const CAN_VIEW_SYSTEM_LOGS: StaffRole[] = ['SUPER_ADMIN']

// Log levels for filtering
const LOG_LEVELS = ['error', 'fatal', 'warn', 'warning', 'info', 'debug', 'trace', 'verbose']

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (!CAN_VIEW_SYSTEM_LOGS.includes(user.primaryRole)) {
		return {
			error: 'You do not have permission to view system logs.',
			logs: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, byLevel: {}, bySource: {}, recentErrors: 0 },
			filters: { level: 'all', source: 'all', search: '' }
		}
	}

	const prisma = await getPrismaClient()

	// ─── Get filter params ──────────────────────────────────────────────
	const page = parseInt(url.searchParams.get('page') || '1')
	const levelFilter = url.searchParams.get('level') || 'all'
	const sourceFilter = url.searchParams.get('source') || 'all'
	const searchQuery = url.searchParams.get('search') || ''

	const skip = (page - 1) * PAGE_SIZE

	// ─── Build where clause ─────────────────────────────────────────────
	const where: any = {}

	if (levelFilter && levelFilter !== 'all') {
		where.level = levelFilter
	}
	if (sourceFilter && sourceFilter !== 'all') {
		where.source = sourceFilter
	}
	if (searchQuery) {
		where.message = { contains: searchQuery, mode: 'insensitive' }
	}

	// ─── Fetch logs ─────────────────────────────────────────────────────
	const [logs, totalCount, levelCounts, sourceCounts, recentErrors] = await Promise.all([
		prisma.systemLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.systemLog.count({ where }),
		prisma.systemLog.groupBy({
			by: ['level'],
			_count: { level: true },
		}),
		prisma.systemLog.groupBy({
			by: ['source'],
			_count: { source: true },
		}),
		prisma.systemLog.count({
			where: {
				level: { in: ['error', 'fatal'] },
				createdAt: {
					gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
				}
			}
		}),
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	// ─── Get unique sources for filter ─────────────────────────────────
	const uniqueSources = await prisma.systemLog.findMany({
		select: { source: true },
		distinct: ['source'],
	})

	// ─── Build stats ────────────────────────────────────────────────────
	const stats = {
		total: totalCount,
		byLevel: levelCounts.reduce((acc, curr) => {
			acc[curr.level] = curr._count.level
			return acc
		}, {} as Record<string, number>),
		bySource: sourceCounts.reduce((acc, curr) => {
			acc[curr.source] = curr._count.source
			return acc
		}, {} as Record<string, number>),
		recentErrors,
	}

	return {
		logs: logs.map((log) => ({
			id: log.id,
			level: log.level,
			message: log.message,
			source: log.source,
			metadata: log.metadata,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			userId: log.userId,
			userType: log.userType,
			createdAt: log.createdAt,
		})),
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
			level: levelFilter,
			source: sourceFilter,
			search: searchQuery,
		},
		sources: uniqueSources.map(s => s.source),
		logLevels: LOG_LEVELS,
	}
}

export const actions: Actions = {
	clearLogs: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (!CAN_VIEW_SYSTEM_LOGS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to clear system logs.' })
		}

		const formData = await request.formData()
		const level = String(formData.get('level') || 'all')
		const source = String(formData.get('source') || 'all')

		const prisma = await getPrismaClient()
		const where: any = {}

		if (level && level !== 'all') {
			where.level = level
		}
		if (source && source !== 'all') {
			where.source = source
		}

		try {
			const result = await prisma.systemLog.deleteMany({ where })
			return { 
				success: true, 
				message: `Cleared ${result.count} log entries`,
				count: result.count
			}
		} catch (error) {
			console.error('[system-logs] Failed to clear logs:', error)
			return fail(500, { error: 'Failed to clear logs' })
		}
	},

	exportLogs: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (!CAN_VIEW_SYSTEM_LOGS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to export system logs.' })
		}

		const formData = await request.formData()
		const level = String(formData.get('level') || 'all')
		const source = String(formData.get('source') || 'all')
		const limit = parseInt(String(formData.get('limit') || '1000'))

		const prisma = await getPrismaClient()
		const where: any = {}

		if (level && level !== 'all') {
			where.level = level
		}
		if (source && source !== 'all') {
			where.source = source
		}

		try {
			const logs = await prisma.systemLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				take: limit,
			})

			return {
				success: true,
				logs: logs.map((log) => ({
					id: log.id,
					level: log.level,
					message: log.message,
					source: log.source,
					metadata: log.metadata,
					ipAddress: log.ipAddress,
					userAgent: log.userAgent,
					userId: log.userId,
					userType: log.userType,
					createdAt: log.createdAt,
				})),
				count: logs.length,
			}
		} catch (error) {
			console.error('[system-logs] Failed to export logs:', error)
			return fail(500, { error: 'Failed to export logs' })
		}
	}
}