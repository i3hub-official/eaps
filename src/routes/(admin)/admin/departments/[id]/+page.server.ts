import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import {
	revealName,
	revealEmail,
	revealStaffNumber,
	revealMatricNumber,
	revealText,
	isEncrypted,
} from '$lib/security/dataProtection.js'

const STAFF_PAGE_SIZE = 15
const STUDENT_PAGE_SIZE = 15
const COURSE_PAGE_SIZE = 15

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[departments] Failed to decrypt field:', e)
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
		throw error(403, 'You do not have permission to view this department.')
	}

	const prisma = await getPrismaClient()

	const department = await prisma.department.findUnique({
		where: { id: params.id },
		include: { college: { select: { id: true, name: true, shortName: true } } },
	})

	if (!department) {
		throw error(404, 'Department not found.')
	}

	const staffPage = parseInt(url.searchParams.get('staffPage') || '1')
	const studentPage = parseInt(url.searchParams.get('studentPage') || '1')
	const coursePage = parseInt(url.searchParams.get('coursePage') || '1')
	const staffSearch = url.searchParams.get('staffSearch') || ''
	const studentSearch = url.searchParams.get('studentSearch') || ''

	const [programmes, courseTotalCount, courses, staffTotalBase, studentTotalBase] = await Promise.all([
		prisma.programme.findMany({ where: { departmentId: department.id }, orderBy: { name: 'asc' } }),
		prisma.course.count({ where: { departmentId: department.id } }),
		prisma.course.findMany({
			where: { departmentId: department.id },
			include: { level: { select: { name: true } } },
			orderBy: { code: 'asc' },
			skip: (coursePage - 1) * COURSE_PAGE_SIZE,
			take: COURSE_PAGE_SIZE,
		}),
		prisma.staff.count({ where: { departmentId: department.id } }),
		prisma.student.count({ where: { departmentId: department.id } }),
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
		}
	}

	function decryptStudent(student: any) {
		const firstName = revealIfEncrypted(student.firstName, revealName)
		const lastName = revealIfEncrypted(student.lastName, revealName)
		const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Student'
		const email = student.email ? (revealIfEncrypted(student.email, revealEmail) || 'Unknown') : 'Unknown'
		const matricNumber = student.matricNumber ? (revealIfEncrypted(student.matricNumber, revealMatricNumber) || 'N/A') : 'N/A'
		// programme.name is a Prisma relation field, not the object itself --
		// stored encrypted (Tier 2 / protectText) unlike Department/Course names.
		const programme = student.programme?.name
			? (revealIfEncrypted(student.programme.name, revealText) || 'N/A')
			: 'N/A'

		return {
			id: student.id,
			name,
			email,
			matricNumber,
			level: student.currentLevel?.name ?? 'N/A',
			programme,
			status: student.status,
		}
	}

	// ─── Staff ──────────────────────────────────────────────────────────
	let staffList: ReturnType<typeof decryptStaff>[]
	let staffTotal: number
	let staffTotalPages: number

	if (staffSearch) {
		const allStaff = await prisma.staff.findMany({
			where: { departmentId: department.id },
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
		staffTotal = staffTotalBase
		staffTotalPages = Math.ceil(staffTotal / STAFF_PAGE_SIZE) || 1
		const staff = await prisma.staff.findMany({
			where: { departmentId: department.id },
			orderBy: { createdAt: 'desc' },
			skip: (staffPage - 1) * STAFF_PAGE_SIZE,
			take: STAFF_PAGE_SIZE,
		})
		staffList = staff.map(decryptStaff)
	}

	// ─── Students ───────────────────────────────────────────────────────
	let studentList: ReturnType<typeof decryptStudent>[]
	let studentTotal: number
	let studentTotalPages: number

	if (studentSearch) {
		const allStudents = await prisma.student.findMany({
			where: { departmentId: department.id },
			include: { currentLevel: { select: { name: true } }, programme: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
		})
		const decrypted = allStudents.map(decryptStudent)
		const q = studentSearch.toLowerCase()
		const filtered = decrypted.filter((s) =>
			s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.matricNumber.toLowerCase().includes(q)
		)
		studentTotal = filtered.length
		studentTotalPages = Math.ceil(studentTotal / STUDENT_PAGE_SIZE) || 1
		studentList = filtered.slice((studentPage - 1) * STUDENT_PAGE_SIZE, (studentPage - 1) * STUDENT_PAGE_SIZE + STUDENT_PAGE_SIZE)
	} else {
		studentTotal = studentTotalBase
		studentTotalPages = Math.ceil(studentTotal / STUDENT_PAGE_SIZE) || 1
		const students = await prisma.student.findMany({
			where: { departmentId: department.id },
			include: { currentLevel: { select: { name: true } }, programme: { select: { name: true } } },
			orderBy: { createdAt: 'desc' },
			skip: (studentPage - 1) * STUDENT_PAGE_SIZE,
			take: STUDENT_PAGE_SIZE,
		})
		studentList = students.map(decryptStudent)
	}

	return {
		department: {
			id: department.id,
			collegeId: department.collegeId,
			name: department.name,
			shortName: department.shortName,
			code: department.code,
			email: department.email,
			phone: department.phone,
			college: department.college.name,
			createdAt: department.createdAt,
		},
		programmes: programmes.map(p => ({
			id: p.id,
			name: p.name ? (revealIfEncrypted(p.name, revealText) || 'N/A') : 'N/A',
			shortName: p.shortName,
			type: p.type,
			durationYears: p.durationYears,
			isActive: p.isActive,
		})),
		courses: courses.map(c => ({
			id: c.id,
			code: c.code,
			title: c.title,
			level: c.level?.name ?? 'N/A',
			creditUnits: c.creditUnits,
			type: c.type,
			status: c.status,
		})),
		coursePagination: {
			currentPage: coursePage,
			totalPages: Math.ceil(courseTotalCount / COURSE_PAGE_SIZE) || 1,
			totalItems: courseTotalCount,
			hasNext: coursePage * COURSE_PAGE_SIZE < courseTotalCount,
			hasPrev: coursePage > 1,
		},
		staff: staffList,
		staffPagination: {
			currentPage: staffPage,
			totalPages: staffTotalPages,
			totalItems: staffTotal,
			hasNext: staffPage < staffTotalPages,
			hasPrev: staffPage > 1,
		},
		students: studentList,
		studentPagination: {
			currentPage: studentPage,
			totalPages: studentTotalPages,
			totalItems: studentTotal,
			hasNext: studentPage < studentTotalPages,
			hasPrev: studentPage > 1,
		},
		filters: { staffSearch, studentSearch },
	}
}