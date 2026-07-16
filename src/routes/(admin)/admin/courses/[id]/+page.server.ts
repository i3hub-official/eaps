import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { revealName, isEncrypted } from '$lib/security/dataProtection.js'

const REG_PAGE_SIZE = 20

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[courses] Failed to decrypt field:', e)
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
		throw error(403, 'You do not have permission to view this course.')
	}

	const prisma = await getPrismaClient()

	const course = await prisma.course.findUnique({
		where: { id: params.id },
		include: {
			department: { select: { id: true, name: true, shortName: true } },
			level: { select: { id: true, name: true } },
		},
	})

	if (!course) {
		throw error(404, 'Course not found.')
	}

	const regPage = parseInt(url.searchParams.get('regPage') || '1')

	const [offerings, assessmentCount, regTotalCount, regStatusCounts] = await Promise.all([
		prisma.courseOffering.findMany({
			where: { courseId: course.id },
			include: {
				semester: { include: { session: { select: { name: true } } } },
				lecturer: { select: { firstName: true, lastName: true, staffNumber: true } },
			},
			orderBy: { createdAt: 'desc' },
		}),
		prisma.assessment.count({ where: { courseId: course.id } }),
		prisma.courseRegistration.count({ where: { courseId: course.id } }),
		prisma.$transaction([
			prisma.courseRegistration.count({ where: { courseId: course.id, status: 'APPROVED' } }),
			prisma.courseRegistration.count({ where: { courseId: course.id, status: 'PENDING' } }),
			prisma.courseRegistration.count({ where: { courseId: course.id, status: 'REJECTED' } }),
		]),
	])

	const registrations = await prisma.courseRegistration.findMany({
		where: { courseId: course.id },
		include: { level: { select: { name: true } }, semester: { select: { type: true } } },
		orderBy: { createdAt: 'desc' },
		skip: (regPage - 1) * REG_PAGE_SIZE,
		take: REG_PAGE_SIZE,
	})

	return {
		course: {
			id: course.id,
			code: course.code,
			title: course.title,
			creditUnits: course.creditUnits,
			type: course.type,
			status: course.status,
			description: course.description,
			department: course.department.name,
			departmentId: course.departmentId,
			level: course.level.name,
			levelId: course.levelId,
			createdAt: course.createdAt,
		},
		offerings: offerings.map(o => {
			const firstName = o.lecturer ? revealIfEncrypted(o.lecturer.firstName, revealName) : ''
			const lastName = o.lecturer ? revealIfEncrypted(o.lecturer.lastName, revealName) : ''
			return {
				id: o.id,
				session: o.semester.session.name,
				semesterType: o.semester.type,
				lecturer: o.lecturer ? [firstName, lastName].filter(Boolean).join(' ') || 'Unknown' : 'Unassigned',
				lecturerStaffNumber: o.lecturer?.staffNumber ?? null,
			}
		}),
		assessmentCount,
		registrations: registrations.map(r => ({
			id: r.id,
			level: r.level.name,
			semesterType: r.semester.type,
			type: r.type,
			status: r.status,
			createdAt: r.createdAt,
		})),
		regPagination: {
			currentPage: regPage,
			totalPages: Math.ceil(regTotalCount / REG_PAGE_SIZE) || 1,
			totalItems: regTotalCount,
			hasNext: regPage * REG_PAGE_SIZE < regTotalCount,
			hasPrev: regPage > 1,
		},
		regStats: {
			approved: regStatusCounts[0],
			pending: regStatusCounts[1],
			rejected: regStatusCounts[2],
			total: regTotalCount,
		},
	}
}