// src/routes/(admin)/admin/suspicious/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

// ─── Define Violation Types manually ──────────────────────────────────────
const VIOLATION_TYPES = [
	'FULLSCREEN_EXIT',
	'TAB_SWITCH',
	'COPY_ATTEMPT',
	'PASTE_ATTEMPT',
	'DEVTOOLS_OPEN',
	'FACE_NOT_DETECTED',
	'FACE_MISMATCH',
	'MULTIPLE_FACES',
	'IDLE_TIMEOUT',
	'NETWORK_DROP',
	'SCREEN_CAPTURE',
	'FOCUS_LOSS',
	'KEYBOARD_SHORTCUT',
	'CLOCK_TAMPER',
] as const

type ViolationType = typeof VIOLATION_TYPES[number]

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view suspicious activity.',
			activities: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
			filters: { severity: 'all', type: 'all', status: 'all' },
			violationTypes: VIOLATION_TYPES
		}
	}

	const prisma = await getPrismaClient()

	const page = parseInt(url.searchParams.get('page') || '1')
	const severityFilter = url.searchParams.get('severity') || 'all'
	const typeFilter = url.searchParams.get('type') || 'all'
	const statusFilter = url.searchParams.get('status') || 'all'

	const skip = (page - 1) * PAGE_SIZE

	const where: any = {}

	if (severityFilter !== 'all') {
		where.severity = parseInt(severityFilter)
	}

	if (typeFilter !== 'all') {
		where.type = typeFilter
	}

	if (statusFilter !== 'all') {
		// You can add a resolved field to violations table
		// For now, we'll just ignore status filter
		// where.resolved = statusFilter === 'resolved'
	}

	// Get violations with high severity or specific types
	const [violations, totalCount] = await Promise.all([
		prisma.violation.findMany({
			where: {
				...where,
				severity: { gte: 1 }
			},
			include: {
				session: {
					include: {
						student: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								matricNumber: true,
								email: true,
							}
						},
						assessment: {
							select: {
								id: true,
								title: true,
								course: {
									select: {
										code: true,
										title: true,
									}
								}
							}
						}
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.violation.count({
			where: {
				...where,
				severity: { gte: 1 }
			}
		})
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	// Process violations
	const processedViolations = violations.map((v) => {
		let studentName = 'Unknown Student'
		let matricNumber = 'N/A'
		
		if (v.session?.student) {
			try {
				const firstName = revealName(v.session.student.firstName)
				const lastName = revealName(v.session.student.lastName)
				studentName = `${firstName} ${lastName}`
				matricNumber = revealMatricNumber(v.session.student.matricNumber)
			} catch (e) {
				console.warn('[suspicious] Failed to decrypt student data:', e)
			}
		}

		return {
			id: v.id,
			type: v.type,
			severity: v.severity,
			metadata: v.metadata,
			screenshot: v.screenshot,
			createdAt: v.createdAt,
			studentName,
			matricNumber,
			assessmentTitle: v.session?.assessment?.title || 'Unknown Assessment',
			courseCode: v.session?.assessment?.course?.code || 'N/A',
			sessionId: v.sessionId,
			resolved: false, // You can add a resolved field to violations table
		}
	})

	// Calculate stats
	const stats = {
		total: totalCount,
		critical: violations.filter(v => v.severity >= 4).length,
		high: violations.filter(v => v.severity === 3).length,
		medium: violations.filter(v => v.severity === 2).length,
		low: violations.filter(v => v.severity === 1).length,
	}

	return {
		activities: processedViolations,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		stats,
		violationTypes: VIOLATION_TYPES,
		filters: {
			severity: severityFilter,
			type: typeFilter,
			status: statusFilter,
		}
	}
}

export const actions: Actions = {
	resolve: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (user.primaryRole !== 'SUPER_ADMIN') {
			return fail(403, { error: 'You do not have permission to resolve violations.' })
		}

		const formData = await request.formData()
		const violationId = String(formData.get('violationId') ?? '')

		if (!violationId) {
			return fail(400, { error: 'Violation ID is required' })
		}

		// You can add a resolved field to the Violation model
		// For now, we'll just log it
		console.log(`[suspicious] Violation ${violationId} resolved by ${user.id}`)

		return { success: true, message: 'Violation marked as resolved' }
	}
}