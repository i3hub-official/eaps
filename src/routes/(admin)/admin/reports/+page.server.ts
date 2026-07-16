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

	// Lookups to resolve IDs -> readable names. These are unencrypted
	// reference tables (institutional data, per project convention), so
	// no dataProtection.ts involvement is needed here.
	const [departments, levels] = await Promise.all([
		prisma.department.findMany({ select: { id: true, name: true, shortName: true } }),
		prisma.level.findMany({ select: { id: true, name: true } }),
	])
	const departmentMap = new Map(departments.map(d => [d.id, d.shortName || d.name]))
	const levelMap = new Map(levels.map(l => [l.id, l.name]))

	// ─── Student Report ──────────────────────────────────────────────────
	const studentReportRaw = await prisma.student.groupBy({
		by: ['status', 'departmentId'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})
	const studentReport = studentReportRaw.map(row => ({
		status: row.status,
		departmentId: row.departmentId,
		department: departmentMap.get(row.departmentId) || 'Unknown',
		count: row._count.status,
	}))

	// ─── Course Report ───────────────────────────────────────────────────
	const courseReportRaw = await prisma.course.groupBy({
		by: ['status', 'type', 'levelId'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})
	const courseReport = courseReportRaw.map(row => ({
		status: row.status,
		type: row.type,
		levelId: row.levelId,
		level: levelMap.get(row.levelId) || 'Unknown',
		count: row._count.status,
	}))

	// ─── Assessment Report ──────────────────────────────────────────────
	const assessmentReportRaw = await prisma.assessment.groupBy({
		by: ['status', 'type'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})
	const assessmentReport = assessmentReportRaw.map(row => ({
		status: row.status,
		type: row.type,
		count: row._count.status,
	}))

	// ─── Registration Report ────────────────────────────────────────────
	const registrationReportRaw = await prisma.courseRegistration.groupBy({
		by: ['status', 'type'],
		_count: { status: true },
		orderBy: { _count: { status: 'desc' } }
	})
	const registrationReport = registrationReportRaw.map(row => ({
		status: row.status,
		type: row.type,
		count: row._count.status,
	}))

	// ─── Staff Report ────────────────────────────────────────────────────
	const staffReportRaw = await prisma.staff.groupBy({
		by: ['primaryRole', 'status'],
		_count: { primaryRole: true },
		orderBy: { _count: { primaryRole: 'desc' } }
	})
	const staffReport = staffReportRaw.map(row => ({
		primaryRole: row.primaryRole,
		status: row.status,
		count: row._count.primaryRole,
	}))

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