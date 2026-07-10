// src/routes/(lecturer)/lecturer/question-bank/create/single-choice/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const courses = await prisma.course.findMany({
		where: {
			status: 'ACTIVE',
			offerings: { some: { lecturerId: user.id } },
		},
		orderBy: { code: 'asc' },
		select: { id: true, code: true, title: true },
	})

	const existingTags = await prisma.questionTag.findMany({
		where: {
			questions: {
				some: { question: { createdById: user.id } },
			},
		},
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		courses: courses.map((c) => ({ id: c.id, code: c.code, title: c.title })),
		existingTags: existingTags.map((t) => ({ id: t.id, name: t.name })),
	}
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		const courseId = String(formData.get('courseId') ?? '')
		const body = String(formData.get('body') ?? '').trim()
		const explanation = String(formData.get('explanation') ?? '').trim() || null
		const difficulty = String(formData.get('difficulty') ?? 'MEDIUM')
		const marks = Number(formData.get('marks') ?? 1)
		const tagsInput = String(formData.get('tags') ?? '').trim()

		if (!courseId) return fail(400, { error: 'Course is required' })
		if (!body) return fail(400, { error: 'Question text is required' })
		if (marks <= 0) return fail(400, { error: 'Marks must be greater than 0' })

		const prisma = await getPrismaClient()

		const course = await prisma.course.findFirst({
			where: { id: courseId, offerings: { some: { lecturerId: user.id } } },
		})
		if (!course) return fail(403, { error: 'You do not have access to this course' })

		const optionBodies: string[] = []
		let correctIndex = -1

		for (let i = 0; i < 4; i++) {
			const opt = String(formData.get(`option${i}`) ?? '').trim()
			if (opt) {
				optionBodies.push(opt)
				if (String(formData.get('correctOption')) === String(i)) {
					correctIndex = optionBodies.length - 1
				}
			}
		}

		if (optionBodies.length < 2) return fail(400, { error: 'At least 2 options are required' })
		if (correctIndex === -1) return fail(400, { error: 'Please select a correct option' })

		const tagNames = tagsInput
			.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0 && t.length <= 50)

		if (tagNames.length > 10) return fail(400, { error: 'Maximum 10 tags allowed' })

		try {
			const tags = await Promise.all(
				tagNames.map((name) =>
					prisma.questionTag.upsert({ where: { name }, update: {}, create: { name } })
				)
			)

			const question = await prisma.question.create({
				data: {
					createdById: user.id,
					courseId,
					type: 'SINGLE_CHOICE',
					difficulty: difficulty as any,
					body,
					explanation,
					marks: new Decimal(marks),
					isActive: true,
					options: {
						create: optionBodies.map((optBody, idx) => ({
							body: optBody,
							isCorrect: idx === correctIndex,
							order: idx,
						})),
					},
					tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
				},
				include: { tags: { include: { tag: true } } },
			})

			return { success: true, questionId: question.id }
		} catch (err) {
			console.error('Create question error:', err)
			return fail(500, { error: 'Failed to create question' })
		}
	},

	// NOTE: bulk import is handled by /lecturer/question-bank/import (+server.ts),
	// called directly via fetch() from the client with toast.promise(). The old
	// `import` action here was removed — it returned raw JSON that doesn't match
	// SvelteKit's action envelope, which is what caused "failed" toasts even on
	// successful imports.
}