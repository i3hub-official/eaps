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

	return {
		courseId: course.id,
		courseCode: course.code,
		courseTitle: course.title
	}
}