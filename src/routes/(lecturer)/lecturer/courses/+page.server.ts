// src/routes/(lecturer)/lecturer/courses/+page.server.ts (UPDATED)
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)

	// Lecturer must have a department
	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			courses: [],
			error: 'No department assigned. Contact your HOD.',
		}
	}

	const prisma = await getPrismaClient()
	const departmentId = user.departmentId

	// Get all courses in lecturer's department
	const courses = await prisma.course.findMany({
		where: {
			departmentId,
			status: 'ACTIVE',
		},
		include: {
			level: true,
			registrations: {
				where: { status: 'APPROVED' },
			},
			assessments: {
				where: { createdById: user.id },
			},
			questions: {
				where: { createdById: user.id },
			},
		},
		orderBy: [{ level: { name: 'asc' } }, { code: 'asc' }],
	})

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
		},
		courses: courses.map((c) => ({
			id: c.id,
			code: c.code,
			title: c.title,
			creditUnits: c.creditUnits,
			type: c.type,
			level: c.level.name,
			studentCount: c.registrations.length,
			assessmentCount: c.assessments.length,
			questionCount: c.questions.length,
		})),
	}
}