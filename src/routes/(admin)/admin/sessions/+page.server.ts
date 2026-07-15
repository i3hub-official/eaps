// src/routes/(admin)/admin/sessions/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { 
	revealName, 
	revealMatricNumber, 
	revealEmail,
	isEncrypted 
} from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

// Only users with these roles can view sessions
const CAN_VIEW_SESSIONS: StaffRole[] = [
	'SUPER_ADMIN',
	'VC',
	'DVC',
	'REGISTRAR',
	'UNIVERSITY_EXAM_OFFICER'
]

// ─── Email Masking ──────────────────────────────────────────────────────────
function maskEmail(email: string): string {
	if (!email) return 'Unknown'
	
	// If it's already masked or doesn't have @, return as-is
	if (!email.includes('@')) return email
	
	const [localPart, domain] = email.split('@')
	
	// If local part is short, mask differently
	if (localPart.length <= 3) {
		return `${localPart.charAt(0)}***@${domain}`
	}
	
	// Keep first and last character, mask the middle
	const first = localPart.charAt(0)
	const last = localPart.charAt(localPart.length - 1)
	const middle = '*'.repeat(Math.min(localPart.length - 2, 4))
	return `${first}${middle}${last}@${domain}`
}

// Helper to safely decrypt a name field
function decryptNameField(value: string | null): string {
	if (!value) return 'Unknown'
	try {
		return revealName(value)
	} catch (e) {
		return value
	}
}

// Helper to safely decrypt and mask an email
function decryptAndMaskEmail(value: string | null): string {
	if (!value) return 'Unknown'
	try {
		const decrypted = revealEmail(value)
		return maskEmail(decrypted)
	} catch (e) {
		return value ? maskEmail(value) : 'Unknown'
	}
}

// Helper to safely decrypt a matric number
function decryptMatricField(value: string | null): string {
	if (!value) return 'N/A'
	try {
		return revealMatricNumber(value)
	} catch (e) {
		return value
	}
}

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
	const [staffSessions, studentSessions] = await Promise.all([
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
	])

	// ─── Process and combine sessions with decryption ──────────────────
	let allSessions: any[] = []

	// Process staff sessions
	for (const session of staffSessions) {
		// Decrypt staff name
		let firstName = 'Unknown'
		let lastName = 'Unknown'
		
		try {
			if (session.staff.firstName) {
				firstName = revealName(session.staff.firstName)
			}
			if (session.staff.lastName) {
				lastName = revealName(session.staff.lastName)
			}
		} catch (e) {
			firstName = session.staff.firstName || 'Unknown'
			lastName = session.staff.lastName || 'Unknown'
		}
		
		const name = `${firstName} ${lastName}`.trim()
		
		// Decrypt and mask email
		const email = decryptAndMaskEmail(session.staff.email)

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
		// Decrypt student name
		let firstName = 'Unknown'
		let lastName = 'Unknown'
		
		try {
			if (session.student.firstName) {
				firstName = revealName(session.student.firstName)
			}
			if (session.student.lastName) {
				lastName = revealName(session.student.lastName)
			}
		} catch (e) {
			firstName = session.student.firstName || 'Unknown'
			lastName = session.student.lastName || 'Unknown'
		}
		
		const name = `${firstName} ${lastName}`.trim()
		
		// Decrypt matric number
		let matricNumber = 'N/A'
		try {
			if (session.student.matricNumber) {
				matricNumber = revealMatricNumber(session.student.matricNumber)
			}
		} catch (e) {
			matricNumber = session.student.matricNumber || 'N/A'
		}
		
		// Decrypt and mask email
		const email = decryptAndMaskEmail(session.student.email)

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