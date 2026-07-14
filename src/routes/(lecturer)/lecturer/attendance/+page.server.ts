// src/routes/(lecturer)/lecturer/attendance/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)

	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			studentAttendance: [],
			courses: [{ id: 'all', label: 'All courses' }],
			levels: [{ id: 'all', label: 'All Levels' }],
			filters: {
				course: null,
				level: null,
				status: null,
			},
			stats: {
				totalStudents: 0,
				averageAttendance: 0,
				attendanceDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
			},
			error: 'No department assigned. Contact your HOD.',
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id
	const departmentId = user.departmentId

	const courseFilter = url.searchParams.get('course')
	const levelFilter = url.searchParams.get('level')
	const statusFilter = url.searchParams.get('status')

	// ─── FIX: Get ONLY courses the lecturer teaches ──────────────────
	const courseOfferings = await prisma.courseOffering.findMany({
		where: { 
			lecturerId: staffId,
			semester: {
				isCurrent: true,
			}
		},
		include: {
			course: {
				select: {
					id: true,
					code: true,
					title: true,
					levelId: true,
				}
			}
		}
	})

	// Extract course IDs the lecturer teaches
	const lecturerCourseIds = courseOfferings.map((offering) => offering.courseId)

	if (lecturerCourseIds.length === 0) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			studentAttendance: [],
			courses: [{ id: 'all', label: 'All courses' }],
			levels: [{ id: 'all', label: 'All Levels' }],
			filters: {
				course: courseFilter || 'all',
				level: levelFilter || 'all',
				status: statusFilter || 'all',
			},
			stats: {
				totalStudents: 0,
				averageAttendance: 0,
				attendanceDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
			},
			error: 'You are not assigned to teach any courses this semester.',
		}
	}

	// Get levels for filter (from courses the lecturer teaches)
	const courseLevels = await prisma.level.findMany({
		where: {
			courses: {
				some: {
					id: { in: lecturerCourseIds }
				}
			}
		},
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	// ─── Get REGISTERED STUDENTS for the lecturer's courses ────────
	const registrations = await prisma.courseRegistration.findMany({
		where: {
			status: 'APPROVED',
			courseId: { in: lecturerCourseIds },
			...(courseFilter && courseFilter !== 'all' ? { courseId: courseFilter } : {}),
		},
		include: {
			student: {
				select: {
					id: true,
					matricNumber: true,
					firstName: true,
					lastName: true,
					otherNames: true,
					currentLevel: { select: { id: true, name: true } },
				},
			},
			course: {
				select: { id: true, code: true, title: true },
			},
		},
		orderBy: [
			{ course: { code: 'asc' } },
			{ student: { matricNumber: 'asc' } },
		],
	})

	// Apply level filter
	let filteredRegistrations = registrations
	if (levelFilter && levelFilter !== 'all') {
		filteredRegistrations = registrations.filter(
			(reg) => reg.student.currentLevel.id === levelFilter
		)
	}

	const studentAttendance = await Promise.all(
		filteredRegistrations.map(async (reg) => {
			// Count sessions for THIS SPECIFIC course and lecturer
			const totalEligibleSessions = await prisma.assessmentSession.count({
				where: {
					studentId: reg.studentId,
					assessment: {
						courseId: reg.courseId,
						createdById: staffId,
					},
				},
			})

			const completedSessions = await prisma.assessmentSession.count({
				where: {
					studentId: reg.studentId,
					status: {
						in: ['SUBMITTED', 'TIMED_OUT'],
					},
					assessment: {
						courseId: reg.courseId,
						createdById: staffId,
					},
				},
			})

			const attendancePercent = totalEligibleSessions > 0
				? Math.round((completedSessions / totalEligibleSessions) * 100)
				: 0

			let name: string
			let matricNumber: string
			try {
				name = `${revealName(reg.student.lastName)}, ${revealName(reg.student.firstName)} ${revealName(reg.student.otherNames)}`
				matricNumber = revealMatricNumber(reg.student.matricNumber)
			} catch {
				name = 'Unable to decrypt name'
				matricNumber = 'N/A'
			}

			// Get last activity date for this student in this course
			const lastSession = await prisma.assessmentSession.findFirst({
				where: {
					studentId: reg.studentId,
					assessment: {
						courseId: reg.courseId,
						createdById: staffId,
					},
				},
				orderBy: { updatedAt: 'desc' },
				select: { updatedAt: true },
			})

			return {
				id: reg.studentId,
				matricNumber,
				name,
				level: reg.student.currentLevel.name,
				levelId: reg.student.currentLevel.id,
				course: reg.course.code,
				courseId: reg.course.id,
				courseTitle: reg.course.title,
				attendance: attendancePercent,
				assessmentsTaken: completedSessions,
				assessmentsEligible: totalEligibleSessions,
				lastActivity: lastSession?.updatedAt || null,
			}
		})
	)

	// Apply status filter
	let filteredByStatus = studentAttendance
	if (statusFilter && statusFilter !== 'all') {
		if (statusFilter === 'excellent') {
			filteredByStatus = studentAttendance.filter((s) => s.attendance >= 80)
		} else if (statusFilter === 'good') {
			filteredByStatus = studentAttendance.filter((s) => s.attendance >= 60 && s.attendance < 80)
		} else if (statusFilter === 'average') {
			filteredByStatus = studentAttendance.filter((s) => s.attendance >= 40 && s.attendance < 60)
		} else if (statusFilter === 'poor') {
			filteredByStatus = studentAttendance.filter((s) => s.attendance < 40)
		}
	}

	// Calculate distribution
	const distribution = {
		excellent: studentAttendance.filter((s) => s.attendance >= 80).length,
		good: studentAttendance.filter((s) => s.attendance >= 60 && s.attendance < 80).length,
		average: studentAttendance.filter((s) => s.attendance >= 40 && s.attendance < 60).length,
		poor: studentAttendance.filter((s) => s.attendance < 40).length,
	}

	// Build courses list for filter (only courses the lecturer teaches)
	const courseList = [
		{ id: 'all', label: 'All courses' },
		...courseOfferings
			.map((offering) => ({
				id: offering.course.id,
				label: `${offering.course.code} — ${offering.course.title}`,
			}))
			.sort((a, b) => a.label.localeCompare(b.label))
	]

	// Build levels list for filter (only levels from courses the lecturer teaches)
	const levelList = [
		{ id: 'all', label: 'All Levels' },
		...courseLevels.map((l) => ({ id: l.id, label: `${l.name} Level` })),
	]

	return {
		user: {
			id: user.id,
			lastName: user.lastName,
			firstName: user.firstName,
		},
		studentAttendance: filteredByStatus,
		courses: courseList,
		levels: levelList,
		filters: {
			course: courseFilter || 'all',
			level: levelFilter || 'all',
			status: statusFilter || 'all',
		},
		stats: {
			totalStudents: filteredByStatus.length,
			averageAttendance: filteredByStatus.length > 0
				? Math.round(filteredByStatus.reduce((sum, s) => sum + s.attendance, 0) / filteredByStatus.length)
				: 0,
			attendanceDistribution: distribution,
		},
	}
}