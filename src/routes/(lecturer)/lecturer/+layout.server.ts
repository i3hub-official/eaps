// src/routes/(lecturer)/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { revealName, revealEmail } from '$lib/security/dataProtection'

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	const prisma = await getPrismaClient()

	const [colleges, departments, levels] = await Promise.all([
		prisma.college.findMany({ orderBy: { name: 'asc' } }),
		prisma.department.findMany({ orderBy: { name: 'asc' } }),
		prisma.level.findMany({ orderBy: { name: 'asc' } }),
	])

	const hasCollege = !!user.collegeId && colleges.length > 0
	const hasDepartment = !!user.departmentId && departments.length > 0

	let courses: Array<{ id: string; code: string; title: string }> = []
	let hasCourse = false

	if (user.departmentId) {
		const offerings = await prisma.courseOffering.findMany({
			where: {
				lecturerId: user.id,
				course: { status: 'ACTIVE' },
			},
			select: {
				courseId: true,
				course: {
					select: {
						id: true,
						code: true,
						title: true,
					},
				},
			},
		})

		if (offerings.length > 0) {
			hasCourse = true
			courses = offerings.map(o => o.course)
		} else {
			courses = await prisma.course.findMany({
				where: { departmentId: user.departmentId },
				orderBy: { code: 'asc' },
				select: { id: true, code: true, title: true },
			})
			hasCourse = courses.length > 0
		}
	}

	const canCreateCollege = ['SUPER_ADMIN', 'REGISTRAR', 'VC', 'DVC'].includes(user.primaryRole)
	const canCreateDepartment = ['SUPER_ADMIN', 'REGISTRAR', 'DEAN', 'HOD'].includes(user.primaryRole)
	const canCreateCourse = ['SUPER_ADMIN', 'REGISTRAR', 'HOD', 'DEPARTMENT_COORDINATOR', 'LECTURER'].includes(
		user.primaryRole,
	)

	// user.firstName / lastName / email are stored encrypted at rest (see
	// protectStaffRegistration in dataProtection.ts). This layout only ever
	// exposes a lecturer their own account's info, so decrypting here is
	// just displaying their own data back to them — not a new access path.
	let firstName = user.firstName || 'Lecturer'
	let lastName = user.lastName || ''
	let email = user.email || ''
	try {
		if (user.firstName) firstName = revealName(user.firstName)
		if (user.lastName) lastName = revealName(user.lastName)
		if (user.email) email = revealEmail(user.email)
	} catch {
		// If decryption fails, fall back to the raw stored values rather than
		// crashing every lecturer page — the fields above already default to
		// safe placeholders/raw values.
	}

	return {
		user: {
			id: user.id,
			firstName,
			lastName,
			email,
			primaryRole: user.primaryRole || 'LECTURER',
			departmentId: user.departmentId,
			collegeId: user.collegeId,
		},
		onboarding: {
			isComplete: hasCollege && hasDepartment && hasCourse,
			hasCollege,
			hasDepartment,
			hasCourse,
			colleges,
			departments,
			levels,
			courses,
			permissions: {
				canCreateCollege,
				canCreateDepartment,
				canCreateCourse,
			},
		},
	}
}