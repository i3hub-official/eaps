// src/routes/(admin)/admin/sessions/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { revealName, revealMatricNumber, revealEmail } from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

// Only users with these roles can view sessions
const CAN_VIEW_SESSIONS: StaffRole[] = [
	'SUPER_ADMIN',
	'VC',
	'DVC',
	'REGISTRAR',
	'UNIVERSITY_EXAM_OFFICER'
]

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (!CAN_VIEW_SESSIONS.includes(user.primaryRole)) {
		return {
			error: 'You do not have permission to view user sessions.',
			sessions: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, active: 0, expired: 0, byUserType: {} },
			filters: { status: 'all', userType: 'all', search: '' }
		}
	}

	const prisma = await getPrismaClient()

	// ─── Get filter params ──────────────────────────────────────────────
	const page = parseInt(url.searchParams.get('page') || '1')
	const statusFilter = url.searchParams.get('status') || 'all'
	const userTypeFilter = url.searchParams.get('userType') || 'all'
	const searchQuery = url.searchParams.get('search') || ''

	const skip = (page - 1) * PAGE_SIZE

	// ─── Get current time ──────────────────────────────────────────────
	const now = new Date()

	// ─── Build where clauses ───────────────────────────────────────────
	const staffWhere: any = {}
	if (statusFilter === 'active') {
		staffWhere.expiresAt = { gt: now }
	} else if (statusFilter === 'expired') {
		staffWhere.expiresAt = { lte: now }
	}

	const studentWhere: any = {}
	if (statusFilter === 'active') {
		studentWhere.expiresAt = { gt: now }
	} else if (statusFilter === 'expired') {
		studentWhere.expiresAt = { lte: now }
	}

	// ─── Fetch sessions ──────────────────────────────────────────────────
	const [staffSessions, studentSessions, staffCount, studentCount] = await Promise.all([
		prisma.staffSession.findMany({
			where: staffWhere,
			include: {
				staff: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						primaryRole: true,
						status: true,
					}
				}
			},
			orderBy: { lastActiveAt: 'desc' },
			skip: userTypeFilter === 'student' ? 0 : skip,
			take: userTypeFilter === 'student' ? 0 : PAGE_SIZE,
		}),
		prisma.studentSession.findMany({
			where: studentWhere,
			include: {
				student: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						matricNumber: true,
						status: true,
					}
				}
			},
			orderBy: { lastActiveAt: 'desc' },
			skip: userTypeFilter === 'staff' ? 0 : skip,
			take: userTypeFilter === 'staff' ? 0 : PAGE_SIZE,
		}),
		prisma.staffSession.count({ where: staffWhere }),
		prisma.studentSession.count({ where: studentWhere }),
	])

	// ─── Process and combine sessions with decryption ──────────────────
	let allSessions: any[] = []

	// Process staff sessions
	for (const session of staffSessions) {
		let name = 'Unknown Staff'
		let email = session.staff.email || 'Unknown'
		
		try {
			// Decrypt staff name
			if (session.staff.firstName && session.staff.lastName) {
				const firstName = revealName(session.staff.firstName)
				const lastName = revealName(session.staff.lastName)
				name = `${firstName} ${lastName}`
			}
			// Decrypt email if encrypted
			if (session.staff.email && isEncrypted(session.staff.email)) {
				email = revealEmail(session.staff.email)
			}
		} catch (e) {
			console.error('[sessions] Failed to decrypt staff data:', e)
			name = 'Staff (Decryption Error)'
		}

		const isActive = session.expiresAt > now
		const timeRemaining = isActive ? session.expiresAt.getTime() - now.getTime() : 0

		allSessions.push({
			id: session.id,
			userId: session.staffId,
			userName: name,
			userEmail: email,
			userType: 'staff',
			role: session.staff.primaryRole,
			userStatus: session.staff.status,
			token: session.token,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			expiresAt: session.expiresAt,
			isActive,
			timeRemaining,
			refreshToken: session.refreshToken,
		})
	}

	// Process student sessions
	for (const session of studentSessions) {
		let name = 'Unknown Student'
		let matricNumber = 'N/A'
		let email = session.student.email || 'Unknown'
		
		try {
			// Decrypt student name
			if (session.student.firstName && session.student.lastName) {
				const firstName = revealName(session.student.firstName)
				const lastName = revealName(session.student.lastName)
				name = `${firstName} ${lastName}`
			}
			// Decrypt matric number
			if (session.student.matricNumber) {
				matricNumber = revealMatricNumber(session.student.matricNumber)
			}
			// Decrypt email if encrypted
			if (session.student.email && isEncrypted(session.student.email)) {
				email = revealEmail(session.student.email)
			}
		} catch (e) {
			console.error('[sessions] Failed to decrypt student data:', e)
			name = 'Student (Decryption Error)'
		}

		const isActive = session.expiresAt > now
		const timeRemaining = isActive ? session.expiresAt.getTime() - now.getTime() : 0

		allSessions.push({
			id: session.id,
			userId: session.studentId,
			userName: name,
			userEmail: email,
			userType: 'student',
			role: 'Student',
			userStatus: session.student.status,
			matricNumber,
			token: session.token,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			expiresAt: session.expiresAt,
			isActive,
			timeRemaining,
			refreshToken: session.refreshToken,
		})
	}

	// ─── Apply search filter ────────────────────────────────────────────
	if (searchQuery) {
		const q = searchQuery.toLowerCase()
		allSessions = allSessions.filter(s =>
			s.userName.toLowerCase().includes(q) ||
			s.userEmail.toLowerCase().includes(q) ||
			(s.matricNumber && s.matricNumber.toLowerCase().includes(q))
		)
	}

	// ─── Apply user type filter ─────────────────────────────────────────
	if (userTypeFilter !== 'all') {
		allSessions = allSessions.filter(s => s.userType === userTypeFilter)
	}

	// ─── Sort by last active ────────────────────────────────────────────
	allSessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())

	const totalCount = allSessions.length
	const totalPages = Math.ceil(totalCount / PAGE_SIZE)
	const paginatedSessions = allSessions.slice(skip, skip + PAGE_SIZE)

	// ─── Calculate statistics ──────────────────────────────────────────
	const activeSessions = allSessions.filter(s => s.isActive).length
	const expiredSessions = allSessions.filter(s => !s.isActive).length

	const byUserType = {
		staff: allSessions.filter(s => s.userType === 'staff').length,
		student: allSessions.filter(s => s.userType === 'student').length,
	}

	// ─── Get summary counts ─────────────────────────────────────────────
	const totalStaffSessions = await prisma.staffSession.count()
	const totalStudentSessions = await prisma.studentSession.count()
	const activeStaffSessions = await prisma.staffSession.count({
		where: { expiresAt: { gt: now } }
	})
	const activeStudentSessions = await prisma.studentSession.count({
		where: { expiresAt: { gt: now } }
	})

	return {
		sessions: paginatedSessions.map((s) => ({
			...s,
			createdAt: s.createdAt.toISOString(),
			lastActiveAt: s.lastActiveAt.toISOString(),
			expiresAt: s.expiresAt.toISOString(),
		})),
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		stats: {
			total: totalCount,
			active: activeSessions,
			expired: expiredSessions,
			byUserType,
			totalStaffSessions,
			totalStudentSessions,
			activeStaffSessions,
			activeStudentSessions,
		},
		filters: {
			status: statusFilter,
			userType: userTypeFilter,
			search: searchQuery,
		}
	}
}

export const actions: Actions = {
	revoke: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (!CAN_VIEW_SESSIONS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to revoke sessions.' })
		}

		const formData = await request.formData()
		const sessionId = String(formData.get('sessionId') || '')
		const sessionType = String(formData.get('sessionType') || 'staff')

		const prisma = await getPrismaClient()

		try {
			if (sessionType === 'staff') {
				await prisma.staffSession.delete({
					where: { id: sessionId }
				})
			} else {
				await prisma.studentSession.delete({
					where: { id: sessionId }
				})
			}
			return { success: true, message: 'Session revoked successfully' }
		} catch (error) {
			console.error('[sessions] Failed to revoke session:', error)
			return fail(500, { error: 'Failed to revoke session' })
		}
	},

	revokeAllUser: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (!CAN_VIEW_SESSIONS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to revoke sessions.' })
		}

		const formData = await request.formData()
		const userId = String(formData.get('userId') || '')
		const userType = String(formData.get('userType') || 'staff')

		if (!userId) {
			return fail(400, { error: 'User ID is required' })
		}

		const prisma = await getPrismaClient()

		try {
			if (userType === 'staff') {
				await prisma.staffSession.deleteMany({
					where: { staffId: userId }
				})
			} else {
				await prisma.studentSession.deleteMany({
					where: { studentId: userId }
				})
			}
			return { success: true, message: 'All user sessions revoked successfully' }
		} catch (error) {
			console.error('[sessions] Failed to revoke all user sessions:', error)
			return fail(500, { error: 'Failed to revoke user sessions' })
		}
	},

	revokeAll: async ({ request, locals }) => {
		const user = await requireStaff(locals.user)

		if (!CAN_VIEW_SESSIONS.includes(user.primaryRole)) {
			return fail(403, { error: 'You do not have permission to revoke sessions.' })
		}

		const prisma = await getPrismaClient()

		try {
			await prisma.staffSession.deleteMany({})
			await prisma.studentSession.deleteMany({})
			return { success: true, message: 'All sessions revoked successfully' }
		} catch (error) {
			console.error('[sessions] Failed to revoke all sessions:', error)
			return fail(500, { error: 'Failed to revoke all sessions' })
		}
	}
}

// ─── Helper to check if value is encrypted ──────────────────────────────
function isEncrypted(value: string | null): boolean {
	if (!value) return false
	// Encrypted values contain a colon separator
	return value.includes(':') && value.length > 20
}