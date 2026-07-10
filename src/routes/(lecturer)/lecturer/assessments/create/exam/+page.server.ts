// src/routes/(lecturer)/lecturer/assessments/create/exam/+page.server.ts
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
			currentSession: '',
			error: 'No department assigned. Contact your HOD.'
		}
	}

	const prisma = await getPrismaClient()

	// Get lecturer's courses
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

	// Get current academic session
	const currentSession = await prisma.academicSession.findFirst({
		where: { isCurrent: true },
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
		currentSession: currentSession?.name ?? '',
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
		const totalMarks = Number(formData.get('totalMarks') ?? 70)
		const passMark = Number(formData.get('passMark') ?? 40)
		const durationMinutes = Number(formData.get('durationMinutes') ?? 120)
		const questionCount = Number(formData.get('questionCount') ?? 10)
		const shuffleQuestions = String(formData.get('shuffleQuestions') ?? 'on') === 'on'
		const shuffleOptions = String(formData.get('shuffleOptions') ?? 'on') === 'on'
		const requireFaceVerify = String(formData.get('requireFaceVerify') ?? 'on') === 'on'
		const requireLiveness = String(formData.get('requireLiveness') ?? 'on') === 'on'
		const fullscreenRequired = String(formData.get('fullscreenRequired') ?? 'on') === 'on'
		const offlineEnabled = String(formData.get('offlineEnabled') ?? 'off') === 'on'

		const startDate = formData.get('startDate') ? new Date(String(formData.get('startDate'))) : null
		const endDate = formData.get('endDate') ? new Date(String(formData.get('endDate'))) : null

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

			// Verify course belongs to lecturer's department
			const course = await prisma.course.findUnique({
				where: { id: courseId },
			})

			if (!course || course.departmentId !== user.departmentId) {
				return fail(403, { error: 'You do not have access to this course' })
			}

			// Create exam (draft)
			const exam = await prisma.assessment.create({
				data: {
					createdById: user.id,
					courseId,
					type: 'EXAMINATION',
					status: 'DRAFT',
					title,
					instructions: instructions,
					totalMarks: toDecimal(totalMarks),
					passMark: toDecimal(passMark),
					durationMinutes,
					questionCount,
					shuffleQuestions,
					shuffleOptions,
					showResultImmediately: false,
					allowReview: false,
					requireFaceVerify,
					requireLiveness,
					fullscreenRequired,
					offlineEnabled,
					startTime: startDate,
					endTime: endDate,
					maxAttempts: 1,
				},
			})

			return { success: true, id: exam.id }
		} catch (err) {
			console.error('Failed to create exam:', err)
			return fail(500, { error: 'Failed to create exam' })
		}
	},
}