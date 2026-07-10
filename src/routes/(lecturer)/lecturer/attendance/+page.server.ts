// src/routes/(lecturer)/lecturer/attendance/+page.server.ts
import type { PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ locals, url }) => {
	// Use the guard to ensure user is authenticated as lecturer
	const user = await requireLecturer(locals.user)

	// If no department ID, return error state
	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			studentAttendance: [],
			courses: [{ id: 'all', label: 'All courses' }],
			filters: {
				course: null,
			},
			stats: {
				totalStudents: 0,
				averageAttendance: 0,
			},
			error: 'No department assigned. Contact your HOD.',
		}
	}

	const prisma = await getPrismaClient()
	const staffId = user.id
	const departmentId = user.departmentId

	// ─── Filters ──────────────────────────────────────────────────────────────

	const courseFilter = url.searchParams.get('course')

	// ─── Get lecturer's courses ───────────────────────────────────────────────

	const courses = await prisma.course.findMany({
		where: { departmentId, status: 'ACTIVE' },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	// ─── Fetch course registrations for attendance calculation ────────────────

	// Build the where clause for registrations
	const registrationWhere: any = {
		status: 'APPROVED',
	}

	if (courseFilter && courseFilter !== 'all') {
		registrationWhere.course = { id: courseFilter }
	} else if (courses.length > 0) {
		registrationWhere.course = { departmentId }
	} else {
		// No courses, return empty
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			studentAttendance: [],
			courses: [
				{ id: 'all', label: 'All courses' },
				...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
			],
			filters: {
				course: courseFilter,
			},
			stats: {
				totalStudents: 0,
				averageAttendance: 0,
			},
		}
	}

	const registrations = await prisma.courseRegistration.findMany({
		where: registrationWhere,
		include: {
			student: {
				select: {
					id: true,
					matricNumber: true,
					firstName: true,
					lastName: true,
					currentLevel: { select: { name: true } },
				},
			},
			course: {
				select: { code: true, title: true },
			},
		},
		orderBy: [
			{ course: { code: 'asc' } },
			{ student: { matricNumber: 'asc' } },
		],
	})

	// ─── Calculate attendance for each student ────────────────────────────────

	const studentAttendance = await Promise.all(
		registrations.map(async (reg) => {
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

			return {
				id: reg.studentId,
				matricNumber: reg.student.matricNumber,
				name: `${reg.student.firstName} ${reg.student.lastName}`,
				level: reg.student.currentLevel.name,
				course: `${reg.course.code}`,
				courseTitle: reg.course.title,
				attendance: attendancePercent,
				assessmentsTaken: completedSessions,
				assessmentsEligible: totalEligibleSessions,
			}
		})
	)

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		studentAttendance,
		courses: [
			{ id: 'all', label: 'All courses' },
			...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
		],
		filters: {
			course: courseFilter,
		},
		stats: {
			totalStudents: registrations.length,
			averageAttendance: studentAttendance.length > 0
				? Math.round(studentAttendance.reduce((sum, s) => sum + s.attendance, 0) / studentAttendance.length)
				: 0,
		},
	}
}