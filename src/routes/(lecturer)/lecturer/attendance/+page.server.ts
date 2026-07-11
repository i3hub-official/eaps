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

	const courseFilter = url.searchParams.get('course')

	const courses = await prisma.course.findMany({
		where: { departmentId, status: 'ACTIVE' },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	const registrationWhere: any = {
		status: 'APPROVED',
	}

	if (courseFilter && courseFilter !== 'all') {
		registrationWhere.course = { id: courseFilter }
	} else if (courses.length > 0) {
		registrationWhere.course = { departmentId }
	} else {
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
					otherNames: true,
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

			// Student PII is stored encrypted at rest (see protectStudentRegistration
			// in dataProtection.ts). Decrypt only the fields this view needs to
			// display, and only for students the lecturer is authorized to see
			// (already scoped above to APPROVED registrations in their own
			// department's courses).
			let name: string
			let matricNumber: string
			try {
				name = `${revealName(reg.student.lastName)}, ${revealName(reg.student.firstName)} ${revealName(reg.student.otherNames)}`
				matricNumber = revealMatricNumber(reg.student.matricNumber)
			} catch {
				// A decryption failure (bad/legacy ciphertext, wrong key, etc.)
				// shouldn't crash the whole attendance list for every other
				// student — surface a clear placeholder for this row instead.
				name = 'Unable to decrypt name'
				matricNumber = 'N/A'
			}

			return {
				id: reg.studentId,
				matricNumber,
				name,
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
			lastName: user.lastName,
			firstName: user.firstName,
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