// src/routes/(lecturer)/lecturer/courses/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Get only courses where the current lecturer is assigned via offering
	const courses = await prisma.course.findMany({
		where: {
			status: 'ACTIVE',
			offerings: {
				some: {
					lecturerId: user.id
				}
			}
		},
		include: {
			level: true,
			registrations: { where: { status: 'APPROVED' } },
			assessments: { where: { createdById: user.id } },
			questions: { where: { createdById: user.id } },
		},
		orderBy: [{ level: { name: 'asc' } }, { code: 'asc' }],
	})

	// Calculate statistics
	const totalCourses = courses.length
	const totalStudents = courses.reduce((sum, c) => sum + c.registrations.length, 0)
	const totalQuestions = courses.reduce((sum, c) => sum + c.questions.length, 0)
	const totalAssessments = courses.reduce((sum, c) => sum + c.assessments.length, 0)

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
		stats: {
			totalCourses,
			totalStudents,
			totalQuestions,
			totalAssessments,
		},
	}
}