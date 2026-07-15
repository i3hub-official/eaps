// src/routes/(admin)/admin/analytics/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view analytics.',
			stats: {},
			trends: {},
			distribution: {}
		}
	}

	const prisma = await getPrismaClient()
	const now = new Date()
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

	// ─── User Statistics ────────────────────────────────────────────────
	const [totalStudents, totalStaff, activeStudents, activeStaff] = await Promise.all([
		prisma.student.count(),
		prisma.staff.count(),
		prisma.student.count({ where: { status: 'ACTIVE' } }),
		prisma.staff.count({ where: { status: 'ACTIVE' } }),
	])

	// ─── Course Statistics ──────────────────────────────────────────────
	const [totalCourses, activeCourses, totalAssessments] = await Promise.all([
		prisma.course.count(),
		prisma.course.count({ where: { status: 'ACTIVE' } }),
		prisma.assessment.count(),
	])

	// ─── Registration Statistics ────────────────────────────────────────
	const [totalRegistrations, pendingRegistrations] = await Promise.all([
		prisma.courseRegistration.count(),
		prisma.courseRegistration.count({ where: { status: 'PENDING' } }),
	])

	// ─── Assessment Statistics ──────────────────────────────────────────
	const [assessmentByType, assessmentByStatus] = await Promise.all([
		prisma.assessment.groupBy({
			by: ['type'],
			_count: { type: true },
		}),
		prisma.assessment.groupBy({
			by: ['status'],
			_count: { status: true },
		}),
	])

	// ─── Monthly Growth ─────────────────────────────────────────────────
	const monthlyStudents = await prisma.$queryRaw`
		SELECT 
			DATE_TRUNC('month', "createdAt") as month,
			COUNT(*) as count
		FROM "Student"
		WHERE "createdAt" >= ${thirtyDaysAgo}
		GROUP BY DATE_TRUNC('month', "createdAt")
		ORDER BY month ASC
	`

	const monthlyRegistrations = await prisma.$queryRaw`
		SELECT 
			DATE_TRUNC('month', "createdAt") as month,
			COUNT(*) as count
		FROM "CourseRegistration"
		WHERE "createdAt" >= ${thirtyDaysAgo}
		GROUP BY DATE_TRUNC('month', "createdAt")
		ORDER BY month ASC
	`

	return {
		stats: {
			students: {
				total: totalStudents,
				active: activeStudents,
				inactive: totalStudents - activeStudents,
			},
			staff: {
				total: totalStaff,
				active: activeStaff,
				inactive: totalStaff - activeStaff,
			},
			courses: {
				total: totalCourses,
				active: activeCourses,
				inactive: totalCourses - activeCourses,
			},
			registrations: {
				total: totalRegistrations,
				pending: pendingRegistrations,
				approved: totalRegistrations - pendingRegistrations,
			},
			assessments: {
				total: totalAssessments,
			},
		},
		distribution: {
			assessmentByType,
			assessmentByStatus,
		},
		trends: {
			monthlyStudents: monthlyStudents.map((row: any) => ({
				month: row.month,
				count: Number(row.count),
			})),
			monthlyRegistrations: monthlyRegistrations.map((row: any) => ({
				month: row.month,
				count: Number(row.count),
			})),
		},
	}
}