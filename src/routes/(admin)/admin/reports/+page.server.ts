// src/routes/(admin)/admin/reports/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view reports.',
			reports: []
		}
	}

	const prisma = await getPrismaClient()

	// ─── Student Report ──────────────────────────────────────────────────
	const studentReport = await prisma.student.groupBy({
		by: ['status', 'departmentId'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})

	// ─── Course Report ───────────────────────────────────────────────────
	const courseReport = await prisma.course.groupBy({
		by: ['status', 'type', 'levelId'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})

	// ─── Assessment Report ──────────────────────────────────────────────
	const assessmentReport = await prisma.assessment.groupBy({
		by: ['status', 'type'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})

	// ─── Registration Report ────────────────────────────────────────────
	const registrationReport = await prisma.courseRegistration.groupBy({
		by: ['status', 'type'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})

	// ─── Staff Report ────────────────────────────────────────────────────
	const staffReport = await prisma.staff.groupBy({
		by: ['primaryRole', 'status'],
		_count: { primaryRole: true },
		orderBy: { _count: { primaryRole: 'desc' } }
	})

	return {
		reports: {
			students: studentReport,
			courses: courseReport,
			assessments: assessmentReport,
			registrations: registrationReport,
			staff: staffReport,
		}
	}
}