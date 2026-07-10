// src/routes/(lecturer)/lecturer/assessments/create/exam/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const courses = await prisma.course.findMany({
		where: { status: 'ACTIVE', offerings: { some: { lecturerId: user.id } } },
		include: {
			level: true,
			questions: { where: { createdById: user.id, isActive: true } },
		},
		orderBy: { code: 'asc' },
	})

	const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } })

	if (courses.length === 0) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			courses: [],
			currentSession: currentSession?.name ?? '',
			error: 'You have no assigned courses this semester. Contact your HOD.',
		}
	}

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
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
		const user = await requireLecturer(locals.user)
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

			// Verify this lecturer actually teaches this course this semester
			const offering = await prisma.courseOffering.findFirst({
				where: { courseId, lecturerId: user.id },
			})

			if (!offering) {
				return fail(403, { error: 'You do not have access to this course' })
			}

			const exam = await prisma.assessment.create({
				data: {
					createdById: user.id,
					courseId,
					type: 'EXAMINATION',
					status: 'DRAFT',
					title,
					instructions,
					totalMarks: Decimal(totalMarks),
					passMark: Decimal(passMark),
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