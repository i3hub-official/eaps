// src/routes/(lecturer)/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	const prisma = await getPrismaClient()

	const [colleges, departments, levels] = await Promise.all([
		prisma.college.findMany({ orderBy: { name: 'asc' } }),
		prisma.department.findMany({ orderBy: { name: 'asc' } }),
		prisma.level.findMany({ orderBy: { name: 'asc' } }),
	])

	// Check if the lecturer has a college and department assigned
	const hasCollege = !!user.collegeId && colleges.length > 0
	const hasDepartment = !!user.departmentId && departments.length > 0

	// Check if the lecturer has been assigned to teach any courses
	let courses: Array<{ id: string; code: string; title: string }> = []
	let hasCourse = false

	if (user.departmentId) {
		// Check for courses in their department OR course offerings
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
			// Fallback: check for courses in their department
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

	return {
		user: {
			id: user.id,
			firstName: user.firstName || 'Lecturer',
			lastName: user.lastName || '',
			email: user.email || '',
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