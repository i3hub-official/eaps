// src/routes/(lecturer)/lecturer/assessments/create/assignment/+page.server.ts
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
		const totalMarks = Number(formData.get('totalMarks') ?? 50)
		const passMark = Number(formData.get('passMark') ?? 25)
		const dueDate = formData.get('dueDate') ? new Date(String(formData.get('dueDate'))) : null
		const allowLateSubmission = String(formData.get('allowLateSubmission') ?? 'off') === 'on'
		const latePenaltyPercent = Number(formData.get('latePenaltyPercent') ?? 10)

		const errors: Record<string, string> = {}

		// Validate
		if (!courseId) errors.courseId = 'Course is required'
		if (!title) errors.title = 'Title is required'
		if (!dueDate) errors.dueDate = 'Due date is required'
		if (totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0'
		if (passMark < 0 || passMark > totalMarks) {
			errors.passMark = `Pass mark must be between 0 and ${totalMarks}`
		}
		if (allowLateSubmission && (latePenaltyPercent < 0 || latePenaltyPercent > 100)) {
			errors.latePenaltyPercent = 'Penalty must be between 0 and 100'
		}

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

			const assignment = await prisma.assessment.create({
				data: {
					createdById: user.id,
					courseId,
					type: 'ASSIGNMENT',
					status: 'DRAFT',
					title,
					instructions,
					totalMarks: toDecimal(totalMarks),
					passMark: toDecimal(passMark),
					durationMinutes: 0,
					questionCount: 1,
					showResultImmediately: false,
					allowReview: true,
					dueDate,
					allowLateSubmission,
					latePenaltyPercent: allowLateSubmission ? toDecimal(latePenaltyPercent) : null,
					requireFaceVerify: false,
					requireLiveness: false,
					fullscreenRequired: false,
					offlineEnabled: false,
					maxAttempts: 1,
				},
			})

			return { success: true, id: assignment.id }
		} catch (err) {
			console.error('Failed to create assignment:', err)
			return fail(500, { error: 'Failed to create assignment' })
		}
	},
}