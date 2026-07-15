// src/routes/(admin)/admin/lecturers/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { 
	revealName, 
	revealEmail, 
	revealText,
	isEncrypted 
} from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[lecturers] Failed to decrypt field:', e)
		return fallback
	}
}

// Robust decrypt that tries multiple methods
function decryptField(value: string | null | undefined): string {
	if (!value) return 'N/A'
	
	// Ensure value is a string
	const strValue = String(value)
	
	// If not encrypted, return as-is
	if (!isEncrypted(strValue)) return strValue
	
	// Try revealName first (most common for names)
	try {
		return safeReveal(() => revealName(strValue), strValue)
	} catch (e) {
		// Try revealText for generic encrypted fields
		try {
			return safeReveal(() => revealText(strValue), strValue)
		} catch (e2) {
			// Try revealEmail for emails
			try {
				return safeReveal(() => revealEmail(strValue), strValue)
			} catch (e3) {
				return strValue // Return original if all fail
			}
		}
	}
}

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

	if (roleFilter !== 'all') {
		where.OR = undefined
		where.primaryRole = roleFilter
	}
	if (statusFilter !== 'all') where.status = statusFilter
	if (departmentFilter !== 'all') where.departmentId = departmentFilter

	const [departments, statsRaw] = await Promise.all([
		prisma.department.findMany({
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' }
		}),
		prisma.$transaction([
			prisma.staff.count({ where }),
			prisma.staff.count({ where: { ...where, status: 'ACTIVE' } }),
			prisma.staff.count({ where: { ...where, status: 'INACTIVE' } }),
			prisma.staff.count({ where: { ...where, status: 'SUSPENDED' } }),
		])
	])

	function decryptStaff(staff: any) {
		// Decrypt all name parts using decryptField
		const firstNameRaw = staff.firstName ? decryptField(staff.firstName) : ''
		const lastNameRaw = staff.lastName ? decryptField(staff.lastName) : ''
		const otherNamesRaw = staff.otherNames ? decryptField(staff.otherNames) : ''

		// Build "Last, First Other" without leaving a dangling comma/space
		const givenParts = [firstNameRaw, otherNamesRaw].filter(Boolean).join(' ')
		const name = [lastNameRaw, givenParts].filter(Boolean).join(', ') || 'Unknown Staff'

		// Email - decrypt if encrypted
		const email = staff.email ? decryptField(staff.email) : 'Unknown'

		// staffNumber is plain text (not encrypted) - use as-is
		const staffNumber = staff.staffNumber || 'N/A'

		// Decrypt college and department names
		const collegeName = staff.college?.name ? decryptField(staff.college.name) : 
						   staff.college?.shortName ? decryptField(staff.college.shortName) : 'N/A'
		const departmentName = staff.department?.name ? decryptField(staff.department.name) : 
							  staff.department?.shortName ? decryptField(staff.department.shortName) : 'N/A'

		return {
			id: staff.id,
			name,
			firstName: firstNameRaw,
			lastName: lastNameRaw,
			otherNames: otherNamesRaw,
			email,
			staffNumber,
			role: staff.primaryRole,
			status: staff.status,
			college: collegeName,
			department: departmentName,
			courseCount: staff.courseOfferings.length,
			createdAt: staff.createdAt,
			lastLoginAt: staff.lastLoginAt,
		}
	}

	let processedLecturers: ReturnType<typeof decryptStaff>[]
	let totalCount: number
	let totalPages: number

	if (searchQuery) {
		const allMatching = await prisma.staff.findMany({
			where,
			include: {
				college: { select: { name: true, shortName: true } },
				department: { select: { name: true, shortName: true } },
				courseOfferings: { include: { course: true } }
			},
			orderBy: { createdAt: 'desc' },
		})

		const decrypted = allMatching.map(decryptStaff)
		const q = searchQuery.toLowerCase()
		const filtered = decrypted.filter((s) =>
			s.name.toLowerCase().includes(q) ||
			s.email.toLowerCase().includes(q) ||
			s.staffNumber.toLowerCase().includes(q)
		)

		totalCount = filtered.length
		totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1
		const skip = (page - 1) * PAGE_SIZE
		processedLecturers = filtered.slice(skip, skip + PAGE_SIZE)
	} else {
		const skip = (page - 1) * PAGE_SIZE
		totalCount = await prisma.staff.count({ where })
		totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1

		const lecturers = await prisma.staff.findMany({
			where,
			include: {
				college: { select: { name: true, shortName: true } },
				department: { select: { name: true, shortName: true } },
				courseOfferings: { include: { course: true } }
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		})

		processedLecturers = lecturers.map(decryptStaff)
	}

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
			total: statsRaw[0],
			active: statsRaw[1],
			inactive: statsRaw[2],
			suspended: statsRaw[3],
		},
		departments: departments.map(d => ({ 
			id: d.id, 
			name: decryptField(d.name), 
			shortName: decryptField(d.shortName) 
		})),
		roles: roles.map(r => ({ value: r, label: r.replace(/_/g, ' ') })),
		filters: {
			search: searchQuery,
			role: roleFilter,
			status: statusFilter,
			department: departmentFilter,
		}
	}
}