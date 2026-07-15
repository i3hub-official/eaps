// src/routes/(admin)/admin/courses/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view courses.',
			courses: [],
			departments: [],
			levels: [],
			stats: { total: 0, active: 0, inactive: 0, discontinued: 0 }
		}
	}

	const prisma = await getPrismaClient()

	const searchQuery = url.searchParams.get('search') || ''
	const departmentFilter = url.searchParams.get('department') || 'all'
	const levelFilter = url.searchParams.get('level') || 'all'
	const statusFilter = url.searchParams.get('status') || 'all'

	const where: any = {}

	if (searchQuery) {
		where.OR = [
			{ code: { contains: searchQuery, mode: 'insensitive' } },
			{ title: { contains: searchQuery, mode: 'insensitive' } },
		]
	}

	if (departmentFilter !== 'all') {
		where.departmentId = departmentFilter
	}

	if (levelFilter !== 'all') {
		where.levelId = levelFilter
	}

	if (statusFilter !== 'all') {
		where.status = statusFilter
	}

	const [courses, departments, levels, stats] = await Promise.all([
		prisma.course.findMany({
			where,
			include: {
				department: { select: { name: true, shortName: true } },
				level: { select: { name: true } },
				offerings: true,
				registrations: { where: { status: 'APPROVED' } },
			},
			orderBy: [{ level: { name: 'asc' } }, { code: 'asc' }]
		}),
		prisma.department.findMany({
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' }
		}),
		prisma.level.findMany({ orderBy: { name: 'asc' } }),
		prisma.$transaction([
			prisma.course.count(),
			prisma.course.count({ where: { status: 'ACTIVE' } }),
			prisma.course.count({ where: { status: 'INACTIVE' } }),
			prisma.course.count({ where: { status: 'DISCONTINUED' } }),
		])
	])

	return {
		courses: courses.map(c => ({
			id: c.id,
			code: c.code,
			title: c.title,
			creditUnits: c.creditUnits,
			type: c.type,
			status: c.status,
			level: c.level?.name || 'N/A',
			department: c.department?.shortName || 'N/A',
			offeringCount: c.offerings.length,
			studentCount: c.registrations.length,
			createdAt: c.createdAt,
		})),
		departments: departments.map(d => ({ id: d.id, name: d.name, shortName: d.shortName })),
		levels: levels.map(l => ({ id: l.id, name: l.name })),
		stats: {
			total: stats[0],
			active: stats[1],
			inactive: stats[2],
			discontinued: stats[3],
		}
	}
}