// src/routes/(lecturer)/lecturer/question-bank/+page.server.ts (updated)
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const courses = await prisma.course.findMany({
		where: { status: 'ACTIVE', offerings: { some: { lecturerId: user.id } } },
		orderBy: { code: 'asc' },
	})

	const selectedCourseId = url.searchParams.get('courseId') ?? courses[0]?.id ?? ''

	const questions = selectedCourseId
		? await prisma.question.findMany({
				where: { createdById: user.id, courseId: selectedCourseId },
				include: { options: { orderBy: { order: 'asc' } } },
				orderBy: { createdAt: 'desc' },
			})
		: []

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		courses: courses.map((c) => ({ id: c.id, code: c.code, title: c.title })),
		selectedCourseId,
		questions: questions.map((q) => ({
			id: q.id,
			type: q.type,
			difficulty: q.difficulty,
			body: q.body,
			marks: q.marks.toString(),
			isActive: q.isActive,
			options: q.options.map((o) => ({ id: o.id, body: o.body, isCorrect: o.isCorrect })),
			optionCount: q.options.length,
			tagCount: 0,
		})),
	}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		// Handle action parameter
		const action = String(formData.get('action') ?? 'create')

		if (action === 'toggleActive') {
			const questionId = String(formData.get('questionId') ?? '')
			const prisma = await getPrismaClient()
			const question = await prisma.question.findUnique({ where: { id: questionId } })
			if (!question || question.createdById !== user.id) {
				return fail(403, { error: 'Not your question' })
			}
			await prisma.question.update({
				where: { id: questionId },
				data: { isActive: !question.isActive },
			})
			return { success: true }
		}

		if (action === 'delete') {
			const questionId = String(formData.get('questionId') ?? '')
			const prisma = await getPrismaClient()
			const question = await prisma.question.findUnique({ where: { id: questionId } })
			if (!question || question.createdById !== user.id) {
				return fail(403, { error: 'Not your question' })
			}
			await prisma.question.delete({ where: { id: questionId } })
			return { success: true }
		}

		// Default: create
		const courseId = String(formData.get('courseId') ?? '')
		const type = String(formData.get('type') ?? 'SINGLE_CHOICE') as
			| 'SINGLE_CHOICE'
			| 'MULTIPLE_CHOICE'
			| 'TRUE_FALSE'
			| 'FILL_BLANK'
			| 'ESSAY'
		const difficulty = String(formData.get('difficulty') ?? 'MEDIUM')
		const body = String(formData.get('body') ?? '').trim()
		const marks = Number(formData.get('marks') ?? 1)
		const explanation = String(formData.get('explanation') ?? '').trim() || null

		const errors: Record<string, string> = {}
		if (!courseId) errors.courseId = 'Course is required'
		if (!body) errors.body = 'Question text is required'
		if (marks <= 0) errors.marks = 'Marks must be greater than 0'

		const prisma = await getPrismaClient()

		// Verify lecturer actually teaches this course
		const offering = courseId
			? await prisma.courseOffering.findFirst({ where: { courseId, lecturerId: user.id } })
			: null
		if (courseId && !offering) errors.courseId = 'You do not teach this course'

		// Collect option rows for choice-type questions
		const optionBodies = formData.getAll('optionBody').map((v) => String(v).trim())
		const correctIndexes = formData.getAll('optionCorrect').map((v) => Number(v))

		if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
			const filled = optionBodies.filter((b) => b.length > 0)
			if (filled.length < 2) errors.options = 'At least 2 options are required'
			if (correctIndexes.length === 0) errors.options = 'Mark at least one option as correct'
		}

		if (Object.keys(errors).length > 0) return fail(400, { errors })

		try {
			await prisma.question.create({
				data: {
					createdById: user.id,
					courseId,
					type,
					difficulty: difficulty as any,
					body,
					explanation,
					marks: Decimal(marks),
					isActive: true,
					options:
						type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE'
							? {
									create: optionBodies
										.map((text, i) => ({ text, i }))
										.filter((o) => o.text.length > 0)
										.map((o) => ({
											body: o.text,
											isCorrect: correctIndexes.includes(o.i),
											order: o.i,
										})),
								}
							: undefined,
				},
			})

			return { success: true }
		} catch (err) {
			console.error('Failed to create question:', err)
			return fail(500, { error: 'Failed to create question' })
		}
	},
}