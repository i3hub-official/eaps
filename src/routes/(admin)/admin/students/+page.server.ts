// src/routes/(admin)/admin/students/+page.server.ts
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

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view students.',
			students: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, active: 0, suspended: 0, graduated: 0 },
			filters: { search: '', level: 'all', status: 'all', department: 'all' }
		}
	}

	const prisma = await getPrismaClient()

	const page = parseInt(url.searchParams.get('page') || '1')
	const searchQuery = url.searchParams.get('search') || ''
	const levelFilter = url.searchParams.get('level') || 'all'
	const statusFilter = url.searchParams.get('status') || 'all'
	const departmentFilter = url.searchParams.get('department') || 'all'

	const skip = (page - 1) * PAGE_SIZE

	const where: any = {}

	if (searchQuery) {
		where.OR = [
			{ matricNumber: { contains: searchQuery, mode: 'insensitive' } },
			{ firstName: { contains: searchQuery, mode: 'insensitive' } },
			{ lastName: { contains: searchQuery, mode: 'insensitive' } },
			{ email: { contains: searchQuery, mode: 'insensitive' } },
		]
	}

	if (levelFilter !== 'all') {
		where.currentLevelId = levelFilter
	}

	if (statusFilter !== 'all') {
		where.status = statusFilter
	}

	if (departmentFilter !== 'all') {
		where.departmentId = departmentFilter
	}

	const [students, totalCount, levels, departments, stats] = await Promise.all([
		prisma.student.findMany({
			where,
			include: {
				currentLevel: { select: { name: true } },
				department: { select: { name: true, shortName: true } },
				programme: { select: { name: true, shortName: true } },
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.student.count({ where }),
		prisma.level.findMany({ orderBy: { name: 'asc' } }),
		prisma.department.findMany({ 
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' } 
		}),
		prisma.$transaction([
			prisma.student.count(),
			prisma.student.count({ where: { status: 'ACTIVE' } }),
			prisma.student.count({ where: { status: 'SUSPENDED' } }),
			prisma.student.count({ where: { status: 'GRADUATED' } }),
		])
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	const processedStudents = students.map((student) => {
		let name = 'Unknown Student'
		let matricNumber = 'N/A'
		let email = 'Unknown'

		try {
			if (student.firstName && student.lastName) {
				const firstName = isEncrypted(student.firstName) ? revealName(student.firstName) : student.firstName
				const lastName = isEncrypted(student.lastName) ? revealName(student.lastName) : student.lastName
				name = `${firstName} ${lastName}`
			}
			if (student.matricNumber) {
				matricNumber = isEncrypted(student.matricNumber) ? revealMatricNumber(student.matricNumber) : student.matricNumber
			}
			if (student.email) {
				email = isEncrypted(student.email) ? revealEmail(student.email) : student.email
			}
		} catch (e) {
			console.warn('[students] Failed to decrypt student data:', e)
		}

		return {
			id: student.id,
			name,
			matricNumber,
			email,
			level: student.currentLevel?.name || 'N/A',
			department: student.department?.shortName || student.department?.name || 'N/A',
			programme: student.programme?.shortName || student.programme?.name || 'N/A',
			status: student.status,
			createdAt: student.createdAt,
			lastLoginAt: student.lastLoginAt,
			faceEnrolledAt: student.faceEnrolledAt,
		}
	})

	return {
		students: processedStudents,
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
			suspended: stats[2],
			graduated: stats[3],
		},
		levels: levels.map(l => ({ id: l.id, name: l.name })),
		departments: departments.map(d => ({ id: d.id, name: d.name, shortName: d.shortName })),
		filters: {
			search: searchQuery,
			level: levelFilter,
			status: statusFilter,
			department: departmentFilter,
		}
	}
}