// src/routes/(lecturer)/lecturer/assessments/create/practice/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { redirect, fail } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { toDecimal } from '$lib/utils/decimal.js'

export const load: PageServerLoad = async ({ locals }) => {
	// Use the guard to ensure user is authenticated as lecturer
	const user = await requireLecturer(locals.user)

	// If no department ID, return error state
	if (!user.departmentId) {
		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			courses: [],
			error: 'No department assigned. Contact your HOD.'
		}
	}

	const prisma = await getPrismaClient()

	const courses = await prisma.course.findMany({
		where: { departmentId: user.departmentId, status: 'ACTIVE' },
		include: {
			level: true,
			questions: {
				where: { createdById: user.id, isActive: true },
			},
		},
		orderBy: { code: 'asc' },
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
			level: c.level.name,
			questionCount: c.questions.length,
		})),
	}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Use the guard
		const user = await requireLecturer(locals.user)
		
		// Check if user has a department
		if (!user.departmentId) {
			return fail(403, { error: 'No department assigned. Contact your HOD.' })
		}
		
		const formData = await request.formData()

		const courseId = String(formData.get('courseId') ?? '')
		const title = String(formData.get('title') ?? '').trim()
		const instructions = String(formData.get('instructions') ?? '').trim() || null
		const totalMarks = Number(formData.get('totalMarks') ?? 100)
		const passMark = Number(formData.get('passMark') ?? 50)
		const durationMinutes = Number(formData.get('durationMinutes') ?? 30)
		const questionCount = Number(formData.get('questionCount') ?? 10)
		const shuffleQuestions = String(formData.get('shuffleQuestions') ?? 'on') === 'on'
		const shuffleOptions = String(formData.get('shuffleOptions') ?? 'on') === 'on'

		const errors: Record<string, string> = {}

		// Validate
		if (!courseId) errors.courseId = 'Course is required'
		if (!title) errors.title = 'Title is required'
		if (totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0'
		if (passMark < 0 || passMark > totalMarks) {
			errors.passMark = `Pass mark must be between 0 and ${totalMarks}`
		}
		if (durationMinutes <= 0) errors.durationMinutes = 'Duration must be greater than 0'
		if (questionCount <= 0) errors.questionCount = 'Question count must be greater than 0'

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors })
		}

		try {
			const prisma = await getPrismaClient()

			const course = await prisma.course.findUnique({
				where: { id: courseId },
			})

			if (!course || course.departmentId !== user.departmentId) {
				return fail(403, { error: 'You do not have access to this course' })
			}

			const practice = await prisma.assessment.create({
				data: {
					createdById: user.id,
					courseId,
					type: 'PRACTICE',
					status: 'DRAFT',
					title,
					instructions,
					totalMarks: toDecimal(totalMarks),
					passMark: toDecimal(passMark),
					durationMinutes,
					questionCount,
					maxAttempts: 999,
					shuffleQuestions,
					shuffleOptions,
					showResultImmediately: true,
					allowReview: true,
					requireFaceVerify: false,
					requireLiveness: false,
					fullscreenRequired: false,
					offlineEnabled: false,
				},
			})

			return { success: true, id: practice.id }
		} catch (err) {
			console.error('Failed to create practice set:', err)
			return fail(500, { error: 'Failed to create practice set' })
		}
	},
}