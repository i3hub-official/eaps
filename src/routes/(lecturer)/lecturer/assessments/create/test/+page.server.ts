// src/routes/(lecturer)/lecturer/assessments/create/test/+page.server.ts (CORRECTED)
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Get courses the lecturer teaches
	const courses = await prisma.course.findMany({
		where: { status: 'ACTIVE', offerings: { some: { lecturerId: user.id } } },
		include: {
			level: true,
			questions: { where: { createdById: user.id, isActive: true } },
		},
		orderBy: { code: 'asc' },
	})

	// Get ALL questions from the lecturer's question bank with tags
	const bankQuestions = await prisma.question.findMany({
		where: {
			createdById: user.id,
			isActive: true,
		},
		include: {
			options: {
				orderBy: { order: 'asc' },
			},
			tags: {
				include: { tag: true },
			},
		},
		orderBy: { createdAt: 'desc' },
	})

	const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } })

	if (courses.length === 0) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			courses: [],
			bankQuestions: [],
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
		bankQuestions: bankQuestions.map((q) => ({
			id: q.id,
			type: q.type,
			difficulty: q.difficulty,
			body: q.body,
			marks: Number(q.marks),
			courseId: q.courseId,
			tags: q.tags.map((t) => t.tag.name),
			options: q.options.map((o) => ({
				id: o.id,
				body: o.body,
				isCorrect: o.isCorrect,
			})),
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
		const totalMarks = Number(formData.get('totalMarks') ?? 30)
		const passMark = Number(formData.get('passMark') ?? 18)
		const durationMinutes = Number(formData.get('durationMinutes') ?? 60)
		const questionCount = Number(formData.get('questionCount') ?? 8)
		const shuffleQuestions = String(formData.get('shuffleQuestions') ?? 'on') === 'on'
		const shuffleOptions = String(formData.get('shuffleOptions') ?? 'on') === 'on'
		const requireFaceVerify = String(formData.get('requireFaceVerify') ?? 'on') === 'on'
		const fullscreenRequired = String(formData.get('fullscreenRequired') ?? 'on') === 'on'

		const startDate = formData.get('startDate') ? new Date(String(formData.get('startDate'))) : null
		const endDate = formData.get('endDate') ? new Date(String(formData.get('endDate'))) : null

		// Parse tags (optional)
		const tagsInput = String(formData.get('tags') ?? '').trim()
		const tagNames = tagsInput
			.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0 && t.length <= 50)
			.slice(0, 10)

		// Parse question IDs
		let questionIds: string[] = []
		try {
			const questionIdsJson = formData.get('questionIds')
			if (questionIdsJson && typeof questionIdsJson === 'string') {
				questionIds = JSON.parse(questionIdsJson)
			}
		} catch (err) {
			console.error('[TEST-CREATE] Failed to parse questionIds:', err)
		}

		console.log('[TEST-CREATE] Form submission:', {
			courseId,
			title,
			totalMarks,
			questionCount,
			selectedQuestions: questionIds.length,
			tags: tagNames.length,
		})

		const errors: Record<string, string> = {}
		if (!courseId) errors.courseId = 'Course is required'
		if (!title) errors.title = 'Title is required'
		if (totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0'
		if (passMark < 0 || passMark > totalMarks) {
			errors.passMark = `Pass mark must be between 0 and ${totalMarks}`
		}
		if (durationMinutes <= 0) errors.durationMinutes = 'Duration must be greater than 0'
		if (questionCount <= 0) errors.questionCount = 'Question count must be greater than 0'
		if (questionIds.length === 0) errors.questions = 'Select at least one question from your bank'
		if (questionIds.length > 0 && questionIds.length < questionCount) {
			errors.questions = `You selected ${questionIds.length} question(s) but set Question Count to ${questionCount}. Select at least ${questionCount}, or lower Question Count.`
		}

		if (Object.keys(errors).length > 0) {
			console.log('[TEST-CREATE] Validation errors:', errors)
			return fail(400, { errors })
		}

		try {
			const prisma = await getPrismaClient()

			console.log('[TEST-CREATE] Verifying course access...')
			const offering = await prisma.courseOffering.findFirst({
				where: { courseId, lecturerId: user.id },
			})

			if (!offering) {
				console.error('[TEST-CREATE] User does not have access to course:', courseId)
				return fail(403, { error: 'You do not have access to this course' })
			}

			console.log('[TEST-CREATE] Verifying question ownership...')
			const ownedQuestions = await prisma.question.findMany({
				where: {
					id: { in: questionIds },
					createdById: user.id,
					courseId,
					isActive: true,
				},
				select: { id: true },
			})

			if (ownedQuestions.length !== questionIds.length) {
				console.error(
					'[TEST-CREATE] Question mismatch. Selected:',
					questionIds.length,
					'Found:',
					ownedQuestions.length
				)
				return fail(400, {
					errors: {
						questions:
							'Some selected questions are no longer available or do not belong to this course. Please re-select from the bank.',
					},
				})
			}

			// Create or get tags
			let tags: any[] = []
			if (tagNames.length > 0) {
				console.log('[TEST-CREATE] Creating/getting tags:', tagNames)
				tags = await Promise.all(
					tagNames.map((name) =>
						prisma.questionTag.upsert({
							where: { name },
							update: {},
							create: { name },
						})
					)
				)
			}

			console.log('[TEST-CREATE] Creating assessment with', questionIds.length, 'questions and', tags.length, 'tags')

			const test = await prisma.$transaction(async (tx) => {
				// Create assessment
				const created = await tx.assessment.create({
					data: {
						createdById: user.id,
						courseId,
						type: 'TEST',
						status: 'DRAFT',
						title,
						instructions,
						totalMarks: new Decimal(totalMarks),
						passMark: new Decimal(passMark),
						durationMinutes,
						questionCount,
						shuffleQuestions,
						shuffleOptions,
						showResultImmediately: true,
						allowReview: true,
						requireFaceVerify,
						fullscreenRequired,
						startTime: startDate,
						endTime: endDate,
						requireLiveness: false,
						offlineEnabled: false,
						maxAttempts: 1,
						// Add tags if any
						...(tags.length > 0 && {
							tags: {
								create: tags.map((tag) => ({
									tagId: tag.id,
								})),
							},
						}),
					},
				})

				console.log('[TEST-CREATE] Assessment created:', created.id)

				// Link questions
				await tx.assessmentQuestion.createMany({
					data: questionIds.map((questionId, index) => ({
						assessmentId: created.id,
						questionId,
						order: index,
					})),
				})

				console.log('[TEST-CREATE] Linked', questionIds.length, 'questions')
				return created
			})

			console.log('[TEST-CREATE] ✅ Success! Assessment ID:', test.id)
			return { success: true, id: test.id }
		} catch (err) {
			console.error('[TEST-CREATE] ❌ Database error:', err)
			const errorMsg = err instanceof Error ? err.message : 'Unknown error'
			return fail(500, { error: `Failed to create test: ${errorMsg}` })
		}
	},
}