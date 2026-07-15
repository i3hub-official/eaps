// src/routes/(admin)/admin/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { 
	revealName, 
	revealMatricNumber, 
	revealEmail, 
	isEncrypted 
} from '$lib/security/dataProtection.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)
	const prisma = await getPrismaClient()

	const now = new Date()
	const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

	// ─── Get enrolled students count ──────────────────────────────────────
	const totalStudents = await prisma.student.count({
		where: { status: 'ACTIVE' }
	})

	const previousStudents = await prisma.student.count({
		where: {
			status: 'ACTIVE',
			createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
		}
	})
	const studentGrowth = previousStudents > 0 
		? ((totalStudents - previousStudents) / previousStudents * 100).toFixed(1)
		: '0'

	// ─── Get student enrollment by level ──────────────────────────────────
	const studentsByLevel = await prisma.student.groupBy({
		by: ['currentLevelId'],
		where: { status: 'ACTIVE' },
		_count: { currentLevelId: true },
		orderBy: { currentLevelId: 'asc' }
	})

	const levelNames = await prisma.level.findMany({
		select: { id: true, name: true, label: true }
	})

	const levelMap = levelNames.reduce((acc, level) => {
		acc[level.id] = level.name
		return acc
	}, {} as Record<string, number>)

	const studentLevelCounts = studentsByLevel.map(item => ({
		level: levelMap[item.currentLevelId] || item.currentLevelId,
		count: item._count.currentLevelId
	}))

	// ─── Get student enrollment by department ────────────────────────────
	const studentsByDepartment = await prisma.student.groupBy({
		by: ['departmentId'],
		where: { status: 'ACTIVE' },
		_count: { departmentId: true },
		take: 5,
		orderBy: { _count: { departmentId: 'desc' } }
	})

	const departmentNames = await prisma.department.findMany({
		where: {
			id: { in: studentsByDepartment.map(item => item.departmentId) }
		},
		select: { id: true, name: true, shortName: true }
	})

	const deptMap = departmentNames.reduce((acc, dept) => {
		acc[dept.id] = dept.name
		return acc
	}, {} as Record<string, string>)

	const topDepartments = studentsByDepartment.map(item => ({
		department: deptMap[item.departmentId] || item.departmentId,
		count: item._count.departmentId
	}))

	// ─── Get active exam sessions ────────────────────────────────────────
	const activeSessions = await prisma.assessmentSession.count({
		where: {
			status: 'IN_PROGRESS',
			expiresAt: { gt: now }
		}
	})

	// ─── Get unique colleges with active sessions ──────────────────────
	const activeColleges = await prisma.assessmentSession.findMany({
		where: {
			status: 'IN_PROGRESS',
			expiresAt: { gt: now }
		},
		include: {
			assessment: {
				include: {
					course: {
						include: {
							department: {
								include: {
									college: true
								}
							}
						}
					}
				}
			}
		},
		distinct: ['assessmentId']
	})

	const uniqueColleges = new Set(
		activeColleges
			.map(s => s.assessment?.course?.department?.college?.shortName)
			.filter(Boolean)
	)

	// ─── Get flagged incidents (last 24 hours) ──────────────────────────
	const flaggedIncidents = await prisma.violation.count({
		where: {
			severity: { gte: 2 },
			createdAt: { gte: twentyFourHoursAgo }
		}
	})

	const previousIncidents = await prisma.violation.count({
		where: {
			severity: { gte: 2 },
			createdAt: {
				gte: new Date(twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000),
				lt: twentyFourHoursAgo
			}
		}
	})
	const incidentChange = previousIncidents > 0 
		? previousIncidents - flaggedIncidents
		: 0

	// ─── Get average attendance ──────────────────────────────────────────
	const attendanceRecords = await prisma.attendanceRecord.findMany({
		where: {
			attendanceSession: {
				date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
			}
		},
		select: { status: true }
	})

	const totalAttendance = attendanceRecords.length
	const presentAttendance = attendanceRecords.filter(r => r.status === 'PRESENT').length
	const avgAttendance = totalAttendance > 0 
		? ((presentAttendance / totalAttendance) * 100).toFixed(1)
		: '0'

	// ─── Get staff statistics with decrypted data ──────────────────────
	const totalStaff = await prisma.staff.count({
		where: { status: 'ACTIVE' }
	})

	const staffByRole = await prisma.staff.groupBy({
		by: ['primaryRole'],
		where: { status: 'ACTIVE' },
		_count: { primaryRole: true }
	})

	const staffRoleCounts = staffByRole.reduce((acc, curr) => {
		acc[curr.primaryRole] = curr._count.primaryRole
		return acc
	}, {} as Record<string, number>)

	// ─── Get recent staff (last 5 joined) with decrypted data ──────────
	const recentStaff = await prisma.staff.findMany({
		where: { status: 'ACTIVE' },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			primaryRole: true,
			status: true,
			createdAt: true,
			collegeId: true,
			departmentId: true,
			college: {
				select: {
					name: true,
					shortName: true,
				}
			},
			department: {
				select: {
					name: true,
					shortName: true,
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 5
	})

	// ─── Helper: Mask email ─────────────────────────────────────────────
	function maskEmail(email: string): string {
		if (!email) return 'Unknown'
		if (!email.includes('@')) return email
		
		const [localPart, domain] = email.split('@')
		if (localPart.length <= 3) {
			return `${localPart.charAt(0)}***@${domain}`
		}
		const first = localPart.charAt(0)
		const last = localPart.charAt(localPart.length - 1)
		const middle = '*'.repeat(Math.min(localPart.length - 2, 4))
		return `${first}${middle}${last}@${domain}`
	}

	// ─── Helper: Decrypt name ───────────────────────────────────────────
	function decryptName(firstName: string | null, lastName: string | null): string {
		if (!firstName && !lastName) return 'Unknown Staff'
		
		let first = ''
		let last = ''
		
		try {
			if (firstName) {
				try {
					first = revealName(firstName)
				} catch (e) {
					first = firstName
				}
			}
			
			if (lastName) {
				try {
					last = revealName(lastName)
				} catch (e) {
					last = lastName
				}
			}
		} catch (e) {
			console.warn('[dashboard] Failed to decrypt staff name:', e)
		}
		
		const fullName = `${first} ${last}`.trim()
		return fullName || 'Unknown Staff'
	}

	// ─── Helper: Decrypt and mask email ─────────────────────────────────
	function decryptAndMaskEmail(email: string | null): string {
		if (!email) return 'Unknown'
		
		try {
			let decrypted: string
			try {
				decrypted = revealEmail(email)
			} catch (e) {
				decrypted = email
			}
			return maskEmail(decrypted)
		} catch (e) {
			console.warn('[dashboard] Failed to decrypt staff email:', e)
			return maskEmail(email)
		}
	}

	// ─── Helper: Decrypt text ───────────────────────────────────────────
	function decryptText(value: string | null): string {
		if (!value) return 'N/A'
		try {
			if (isEncrypted(value)) {
				return revealName(value)
			}
			return value
		} catch (e) {
			return value
		}
	}

	const processedRecentStaff = recentStaff.map((staff) => {
		const name = decryptName(staff.firstName, staff.lastName)
		const email = decryptAndMaskEmail(staff.email)
		
		const collegeName = staff.college?.name || 'N/A'
		const departmentName = staff.department?.name || 'N/A'
		
		return {
			id: staff.id,
			name,
			email,
			role: staff.primaryRole,
			status: staff.status,
			joinedAt: staff.createdAt,
			college: decryptText(collegeName),
			department: decryptText(departmentName),
		}
	})

	// ─── Get development team members with full names ──────────────────
	const devTeam = await prisma.developerTeam.findMany({
		where: { isActive: true },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			permissions: true,
			acceptedAt: true,
			lastLoginAt: true,
		},
		orderBy: { acceptedAt: 'desc' }
	})

	// ─── Get live exam sessions with details ─────────────────────────────
	const liveSessions = await prisma.assessmentSession.findMany({
		where: {
			status: 'IN_PROGRESS',
			expiresAt: { gt: now }
		},
		include: {
			assessment: {
				include: {
					course: {
						include: {
							department: {
								include: {
									college: true
								}
							}
						}
					}
				}
			},
			student: {
				select: {
					matricNumber: true,
					firstName: true,
					lastName: true,
				}
			}
		},
		orderBy: { expiresAt: 'asc' },
		take: 5
	})

	const processedLiveSessions = await Promise.all(liveSessions.map(async (session) => {
		let courseCode = 'Unknown'
		let courseTitle = 'Unknown'
		let collegeName = 'Unknown'
		let studentName = 'Unknown'
		let status: 'in-progress' | 'ending-soon' | 'flagged' = 'in-progress'

		if (session.assessment?.course) {
			courseCode = session.assessment.course.code
			courseTitle = session.assessment.course.title
			if (session.assessment.course.department?.college) {
				collegeName = session.assessment.course.department.college.shortName
			}
		}

		if (session.student) {
			try {
				const firstName = session.student.firstName ? revealName(session.student.firstName) : ''
				const lastName = session.student.lastName ? revealName(session.student.lastName) : ''
				studentName = `${firstName} ${lastName}`.trim()
			} catch (e) {
				studentName = 'Unknown'
			}
		}

		if (session.expiresAt) {
			const timeRemaining = session.expiresAt.getTime() - now.getTime()
			if (timeRemaining < 15 * 60 * 1000) {
				status = 'ending-soon'
			}
		}

		const hasViolations = await prisma.violation.count({
			where: {
				sessionId: session.id,
				severity: { gte: 2 },
				createdAt: { gte: twentyFourHoursAgo }
			}
		})
		if (hasViolations > 0) {
			status = 'flagged'
		}

		const candidateCount = await prisma.assessmentSession.count({
			where: {
				assessmentId: session.assessmentId,
				status: 'IN_PROGRESS'
			}
		})

		return {
			course: `${courseCode} — ${courseTitle}`,
			college: collegeName,
			candidates: candidateCount,
			student: studentName,
			status,
			expiresAt: session.expiresAt,
			timeRemaining: session.expiresAt ? Math.floor((session.expiresAt.getTime() - now.getTime()) / 60000) : 0
		}
	}))

	// ─── Get audit log (recent activity) ─────────────────────────────────
	const auditLog = await prisma.auditLog.findMany({
		where: {
			createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
		},
		include: {
			staff: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					primaryRole: true,
					email: true,
				}
			},
			student: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					matricNumber: true,
					email: true,
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 10
	})

	const processedAuditLog = await Promise.all(auditLog.map(async (log) => {
		let actor = 'System'
		let actorType = 'system'

		if (log.staff) {
			try {
				const firstName = log.staff.firstName ? revealName(log.staff.firstName) : ''
				const lastName = log.staff.lastName ? revealName(log.staff.lastName) : ''
				actor = `${firstName} ${lastName}`.trim()
				if (log.staff.primaryRole) {
					actor += ` (${log.staff.primaryRole.replace(/_/g, ' ')})`
				}
				actorType = 'staff'
			} catch (e) {
				actor = 'Staff (Decryption Error)'
			}
		} else if (log.student) {
			try {
				const firstName = log.student.firstName ? revealName(log.student.firstName) : ''
				const lastName = log.student.lastName ? revealName(log.student.lastName) : ''
				actor = `${firstName} ${lastName}`.trim()
				if (log.student.matricNumber) {
					try {
						const matric = revealMatricNumber(log.student.matricNumber)
						actor += ` (${matric})`
					} catch (e) {}
				}
				actorType = 'student'
			} catch (e) {
				actor = 'Student (Decryption Error)'
			}
		}

		let target = log.entityId || log.entity || 'N/A'
		if (log.entityId && log.entityId.length > 20) {
			target = log.entityId.substring(0, 16) + '…'
		}

		return {
			time: log.createdAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
			actor,
			action: log.action || 'Unknown action',
			target: target,
			ip: log.ipAddress || '—',
			entity: log.entity,
			actorType,
		}
	}))

	// ─── Get session statistics ──────────────────────────────────────────
	const totalSessions = await prisma.assessmentSession.count()
	const completedSessions = await prisma.assessmentSession.count({
		where: { status: 'SUBMITTED' }
	})
	const sessionCompletionRate = totalSessions > 0 
		? ((completedSessions / totalSessions) * 100).toFixed(1)
		: '0'

	// ─── Get today's stats ───────────────────────────────────────────────
	const todayStart = new Date()
	todayStart.setHours(0, 0, 0, 0)

	const todaySessions = await prisma.assessmentSession.count({
		where: {
			createdAt: { gte: todayStart }
		}
	})

	const todayViolations = await prisma.violation.count({
		where: {
			createdAt: { gte: todayStart }
		}
	})

	// ─── Get upcoming sessions (next 24 hours) ──────────────────────────
	const upcomingSessions = await prisma.assessmentSession.count({
		where: {
			status: 'PENDING',
			expiresAt: {
				gte: now,
				lte: new Date(now.getTime() + 24 * 60 * 60 * 1000)
			}
		}
	})

	return {
		stats: {
			totalStudents,
			studentGrowth: parseFloat(studentGrowth),
			activeSessions,
			activeColleges: uniqueColleges.size,
			flaggedIncidents,
			incidentChange,
			avgAttendance: parseFloat(avgAttendance),
			sessionCompletionRate: parseFloat(sessionCompletionRate),
			todaySessions,
			todayViolations,
			upcomingSessions,
			totalStaff,
			staffRoleCounts,
		},
		studentStats: {
			byLevel: studentLevelCounts,
			topDepartments: topDepartments,
		},
		liveSessions: processedLiveSessions,
		auditLog: processedAuditLog,
		recentStaff: processedRecentStaff,
		devTeam: devTeam.map(d => ({
			id: d.id,
			email: d.email,
			name: d.name,
			role: d.role,
			permissions: d.permissions,
			acceptedAt: d.acceptedAt,
			lastLoginAt: d.lastLoginAt,
		})),
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			primaryRole: user.primaryRole,
		}
	}
}