// src/routes/(admin)/admin/lecturers/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { revealName, revealEmail, isEncrypted } from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view lecturers.',
			lecturers: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, active: 0, inactive: 0, suspended: 0 },
			filters: { search: '', role: 'all', status: 'all', department: 'all' }
		}
	}

	const prisma = await getPrismaClient()

	const page = parseInt(url.searchParams.get('page') || '1')
	const searchQuery = url.searchParams.get('search') || ''
	const roleFilter = url.searchParams.get('role') || 'all'
	const statusFilter = url.searchParams.get('status') || 'all'
	const departmentFilter = url.searchParams.get('department') || 'all'

	const skip = (page - 1) * PAGE_SIZE

	// Get all staff with LECTURER role or other teaching roles
	const where: any = {
		OR: [
			{ primaryRole: 'LECTURER' },
			{ primaryRole: 'HOD' },
			{ primaryRole: 'DEAN' },
			{ primaryRole: 'DEPARTMENT_COORDINATOR' },
			{ primaryRole: 'DEPARTMENT_EXAM_OFFICER' },
			{ primaryRole: 'COLLEGE_COORDINATOR' },
			{ primaryRole: 'COLLEGE_EXAM_OFFICER' },
		]
	}

	if (searchQuery) {
		where.OR = [
			{ firstName: { contains: searchQuery, mode: 'insensitive' } },
			{ lastName: { contains: searchQuery, mode: 'insensitive' } },
			{ email: { contains: searchQuery, mode: 'insensitive' } },
			{ staffNumber: { contains: searchQuery, mode: 'insensitive' } },
		]
	}

	if (roleFilter !== 'all') {
		where.primaryRole = roleFilter
	}

	if (statusFilter !== 'all') {
		where.status = statusFilter
	}

	if (departmentFilter !== 'all') {
		where.departmentId = departmentFilter
	}

	const [lecturers, totalCount, departments, stats] = await Promise.all([
		prisma.staff.findMany({
			where,
			include: {
				college: { select: { name: true, shortName: true } },
				department: { select: { name: true, shortName: true } },
				courseOfferings: {
					include: { course: true }
				}
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.staff.count({ where }),
		prisma.department.findMany({ 
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' } 
		}),
		prisma.$transaction([
			prisma.staff.count({ where: { ...where } }),
			prisma.staff.count({ where: { ...where, status: 'ACTIVE' } }),
			prisma.staff.count({ where: { ...where, status: 'INACTIVE' } }),
			prisma.staff.count({ where: { ...where, status: 'SUSPENDED' } }),
		])
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	const processedLecturers = lecturers.map((staff) => {
		let name = 'Unknown Staff'
		let email = 'Unknown'

		try {
			if (staff.firstName && staff.lastName) {
				const firstName = isEncrypted(staff.firstName) ? revealName(staff.firstName) : staff.firstName
				const lastName = isEncrypted(staff.lastName) ? revealName(staff.lastName) : staff.lastName
				name = `${firstName} ${lastName}`
			}
			if (staff.email) {
				email = isEncrypted(staff.email) ? revealEmail(staff.email) : staff.email
			}
		} catch (e) {
			console.warn('[lecturers] Failed to decrypt staff data:', e)
		}

		return {
			id: staff.id,
			name,
			email,
			staffNumber: staff.staffNumber,
			role: staff.primaryRole,
			status: staff.status,
			college: staff.college?.shortName || staff.college?.name || 'N/A',
			department: staff.department?.shortName || staff.department?.name || 'N/A',
			courseCount: staff.courseOfferings.length,
			createdAt: staff.createdAt,
			lastLoginAt: staff.lastLoginAt,
		}
	})

	const roles = Object.values(StaffRole).filter(r => 
		['LECTURER', 'HOD', 'DEAN', 'DEPARTMENT_COORDINATOR', 'DEPARTMENT_EXAM_OFFICER', 'COLLEGE_COORDINATOR', 'COLLEGE_EXAM_OFFICER'].includes(r)
	)

	return {
		lecturers: processedLecturers,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		stats: {
			total: stats[0],
			active: stats[1],
			inactive: stats[2],
			suspended: stats[3],
		},
		departments: departments.map(d => ({ id: d.id, name: d.name, shortName: d.shortName })),
		roles: roles.map(r => ({ value: r, label: r.replace(/_/g, ' ') })),
		filters: {
			search: searchQuery,
			role: roleFilter,
			status: statusFilter,
			department: departmentFilter,
		}
	}
}