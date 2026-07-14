// src/routes/(lecturer)/lecturer/courses/[id]/edit/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()
	const courseId = params.id

	// Verify the lecturer has access to this course
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			offerings: {
				where: {
					lecturerId: user.id
				}
			},
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				}
			},
			level: {
				select: {
					id: true,
					name: true,
				}
			}
		}
	})

	if (!course) {
		throw error(404, 'Course not found')
	}

	// Verify the lecturer has access to this course
	const hasAccess = course.offerings.some(o => o.lecturerId === user.id)
	if (!hasAccess) {
		throw error(403, 'You do not have access to this course')
	}

	// Get course statistics for the info display
	const stats = await prisma.$transaction([
		prisma.courseRegistration.count({
			where: {
				courseId: courseId,
				status: 'APPROVED'
			}
		}),
		prisma.assessment.count({
			where: {
				courseId: courseId,
				createdById: user.id
			}
		}),
		prisma.question.count({
			where: {
				courseId: courseId,
				createdById: user.id,
				isActive: true
			}
		})
	])

	const [studentCount, assessmentCount, questionCount] = stats

	return {
		courseId: course.id,
		courseCode: course.code,
		courseTitle: course.title,
		courseDepartment: course.department?.name || 'N/A',
		courseLevel: course.level?.name || 'N/A',
		creditUnits: course.creditUnits,
		studentCount,
		assessmentCount,
		questionCount,
		// Add management contact info (can be moved to environment variables)
		managementContact: {
			email: process.env.REGISTRAR_EMAIL || 'registrar@mouau.edu.ng',
			phone: process.env.REGISTRAR_PHONE || '+234 800 123 4567',
			office: 'Administrative Block, Room 201'
		}
	}
}