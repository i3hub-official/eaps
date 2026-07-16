import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { revealName, revealEmail, revealStaffNumber, revealText, isEncrypted } from '$lib/security/dataProtection.js'

const DEPT_PAGE_SIZE = 10
const STAFF_PAGE_SIZE = 20

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[colleges] Failed to decrypt field:', e)
		return fallback
	}
}

function revealIfEncrypted(value: string | null | undefined, reveal: (v: string) => string): string {
	if (!value) return ''
	return isEncrypted(value) ? safeReveal(() => reveal(value), value) : value
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		throw error(403, 'You do not have permission to view this college.')
	}

	const prisma = await getPrismaClient()

	const college = await prisma.college.findUnique({
		where: { id: params.id },
		include: { university: { select: { name: true, shortName: true } } },
	})

	if (!college) {
		throw error(404, 'College not found.')
	}

	const deptPage = parseInt(url.searchParams.get('deptPage') || '1')
	const staffPage = parseInt(url.searchParams.get('staffPage') || '1')
	const staffSearch = url.searchParams.get('staffSearch') || ''

	const [deptTotalCount, departments, staffTotalCountBase] = await Promise.all([
		prisma.department.count({ where: { collegeId: college.id } }),
		prisma.department.findMany({
			where: { collegeId: college.id },
			include: { _count: { select: { staff: true, students: true, courses: true } } },
			orderBy: { name: 'asc' },
			skip: (deptPage - 1) * DEPT_PAGE_SIZE,
			take: DEPT_PAGE_SIZE,
		}),
		prisma.staff.count({ where: { collegeId: college.id } }),
	])

	function decryptStaff(staff: any) {
		const firstName = revealIfEncrypted(staff.firstName, revealName)
		const lastName = revealIfEncrypted(staff.lastName, revealName)
		const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Staff'
		const email = staff.email ? (revealIfEncrypted(staff.email, revealEmail) || 'Unknown') : 'Unknown'
		const staffNumber = staff.staffNumber ? (revealIfEncrypted(staff.staffNumber, revealStaffNumber) || 'N/A') : 'N/A'

		return {
			id: staff.id,
			name,
			email,
			staffNumber,
			role: staff.primaryRole,
			status: staff.status,
			department: staff.department?.name || 'N/A',
		}
	}

	let staffList: ReturnType<typeof decryptStaff>[]
	let staffTotal: number
	let staffTotalPages: number

	if (staffSearch) {
		const allStaff = await prisma.staff.findMany({
			where: { collegeId: college.id },
			include: { department: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
		})
		const decrypted = allStaff.map(decryptStaff)
		const q = staffSearch.toLowerCase()
		const filtered = decrypted.filter((s) =>
			s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.staffNumber.toLowerCase().includes(q)
		)
		staffTotal = filtered.length
		staffTotalPages = Math.ceil(staffTotal / STAFF_PAGE_SIZE) || 1
		staffList = filtered.slice((staffPage - 1) * STAFF_PAGE_SIZE, (staffPage - 1) * STAFF_PAGE_SIZE + STAFF_PAGE_SIZE)
	} else {
		staffTotal = staffTotalCountBase
		staffTotalPages = Math.ceil(staffTotal / STAFF_PAGE_SIZE) || 1
		const staff = await prisma.staff.findMany({
			where: { collegeId: college.id },
			include: { department: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
			skip: (staffPage - 1) * STAFF_PAGE_SIZE,
			take: STAFF_PAGE_SIZE,
		})
		staffList = staff.map(decryptStaff)
	}

	return {
		college: {
			id: college.id,
			universityId: college.universityId,
			name: college.name,
			shortName: college.shortName,
			code: college.code,
			email: college.email,
			phone: college.phone,
			// University.name is stored encrypted in this dataset -- decrypt
			// before display. shortName kept for potential future use.
			university: revealIfEncrypted(college.university.name, revealText) || college.university.shortName,
			createdAt: college.createdAt,
		},
		departments: departments.map(d => ({
			id: d.id,
			name: d.name,
			shortName: d.shortName,
			code: d.code,
			staffCount: d._count.staff,
			studentCount: d._count.students,
			courseCount: d._count.courses,
		})),
		deptPagination: {
			currentPage: deptPage,
			totalPages: Math.ceil(deptTotalCount / DEPT_PAGE_SIZE) || 1,
			totalItems: deptTotalCount,
			hasNext: deptPage * DEPT_PAGE_SIZE < deptTotalCount,
			hasPrev: deptPage > 1,
		},
		staff: staffList,
		staffPagination: {
			currentPage: staffPage,
			totalPages: staffTotalPages,
			totalItems: staffTotal,
			hasNext: staffPage < staffTotalPages,
			hasPrev: staffPage > 1,
		},
		filters: { staffSearch },
	}
}