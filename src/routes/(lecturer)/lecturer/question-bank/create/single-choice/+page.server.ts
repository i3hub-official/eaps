// src/routes/(lecturer)/lecturer/question-bank/create/single-choice/+page.server.ts (WITH TAGS)
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Get only courses the lecturer actually teaches
	const courses = await prisma.course.findMany({
		where: {
			status: 'ACTIVE',
			offerings: { some: { lecturerId: user.id } },
		},
		orderBy: { code: 'asc' },
		select: {
			id: true,
			code: true,
			title: true,
		},
	})

	// Get existing tags for this lecturer
	const existingTags = await prisma.questionTag.findMany({
		where: {
			questions: {
				some: {
					question: {
						createdById: user.id,
					},
				},
			},
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: { name: 'asc' },
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
		})),
		existingTags: existingTags.map((t) => ({
			id: t.id,
			name: t.name,
		})),
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

		// Validate basic fields
		if (!courseId) return fail(400, { error: 'Course is required' })
		if (!body) return fail(400, { error: 'Question text is required' })
		if (marks <= 0) return fail(400, { error: 'Marks must be greater than 0' })

		const prisma = await getPrismaClient()

		// Verify course belongs to lecturer
		const course = await prisma.course.findFirst({
			where: {
				id: courseId,
				offerings: { some: { lecturerId: user.id } },
			},
		})

		if (!course) {
			return fail(403, { error: 'You do not have access to this course' })
		}

		// Get options (A, B, C, D only)
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

		if (optionBodies.length < 2) {
			return fail(400, { error: 'At least 2 options are required' })
		}

		if (correctIndex === -1) {
			return fail(400, { error: 'Please select a correct option' })
		}

		// Parse tags
		const tagNames = tagsInput
			.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0 && t.length <= 50)

		if (tagNames.length > 10) {
			return fail(400, { error: 'Maximum 10 tags allowed' })
		}

		try {
			// Create or get tags
			const tags = await Promise.all(
				tagNames.map((name) =>
					prisma.questionTag.upsert({
						where: { name },
						update: {},
						create: { name },
					})
				)
			)

			// Create question with tags
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
					tags: {
						create: tags.map((tag) => ({
							tagId: tag.id,
						})),
					},
				},
				include: {
					tags: {
						include: { tag: true },
					},
				},
			})

			return { success: true, questionId: question.id }
		} catch (err) {
			console.error('Create question error:', err)
			return fail(500, { error: 'Failed to create question' })
		}
	},

	import: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		const courseId = String(formData.get('courseId') ?? '')
		const file = formData.get('file') as File | null

		if (!courseId) return fail(400, { error: 'Course is required' })
		if (!file) return fail(400, { error: 'File is required' })

		const prisma = await getPrismaClient()

		// Verify course access
		const course = await prisma.course.findFirst({
			where: {
				id: courseId,
				offerings: { some: { lecturerId: user.id } },
			},
		})

		if (!course) {
			return fail(403, { error: 'You do not have access to this course' })
		}

		try {
			const content = await file.text()
			const questions: any[] = []

			// Parse based on file type
			if (file.name.endsWith('.json')) {
				const data = JSON.parse(content)
				questions.push(...(Array.isArray(data) ? data : [data]))
			} else if (file.name.endsWith('.txt')) {
				// Parse TXT format
				const blocks = content.split(/\n\n+/)
				for (const block of blocks) {
					const lines = block.split('\n').filter((l) => l.trim())
					if (lines.length < 3) continue

					const currentQuestion: any = {
						body: lines[0],
						options: [],
						tags: [],
					}

					for (const line of lines.slice(1)) {
						if (line.match(/^[A-D]\)/i)) {
							const text = line.substring(2).trim()
							currentQuestion.options.push(text)
						} else if (line.toUpperCase().startsWith('CORRECT:')) {
							currentQuestion.correct = line.substring(8).trim().toUpperCase()
						} else if (line.toUpperCase().startsWith('TAGS:')) {
							const tagStr = line.substring(5).trim()
							currentQuestion.tags = tagStr.split(',').map((t: string) => t.trim().toLowerCase())
						} else if (line.toUpperCase().startsWith('DIFFICULTY:')) {
							currentQuestion.difficulty = line.substring(11).trim().toUpperCase()
						} else if (line.toUpperCase().startsWith('MARKS:')) {
							currentQuestion.marks = Number(line.substring(6).trim())
						}
					}

					if (currentQuestion.options.length >= 2) {
						questions.push(currentQuestion)
					}
				}
			} else {
				return fail(400, { error: 'Unsupported file format. Use .json or .txt' })
			}

			// Validate and import questions
			const imported: any[] = []
			const errors: string[] = []

			for (let idx = 0; idx < questions.length; idx++) {
				const q = questions[idx]

				if (!q.body || !q.body.trim()) {
					errors.push(`Question ${idx + 1}: Missing question text`)
					continue
				}

				if (!q.options || q.options.length < 2) {
					errors.push(`Question ${idx + 1}: Need at least 2 options`)
					continue
				}

				if (q.options.length > 4) {
					errors.push(`Question ${idx + 1}: Maximum 4 options allowed`)
					continue
				}

				const marks = Number(q.marks) || 1
				if (marks <= 0) {
					errors.push(`Question ${idx + 1}: Invalid marks`)
					continue
				}

				// Find correct option
				let correctIdx = -1
				const optionTexts = q.options.map((o: any) => o.text || o)

				if (q.correct) {
					const correctLetter = q.correct.toUpperCase().charCodeAt(0) - 65
					if (correctLetter >= 0 && correctLetter < optionTexts.length) {
						correctIdx = correctLetter
					}
				} else if (q.correctIndex !== undefined) {
					correctIdx = q.correctIndex
				}

				if (correctIdx === -1) {
					errors.push(`Question ${idx + 1}: No correct answer marked`)
					continue
				}

				try {
					// Create or get tags
					const tagNames = (q.tags || [])
						.map((t: string) => t.trim().toLowerCase())
						.filter((t: string) => t.length > 0 && t.length <= 50)
						.slice(0, 10)

					const tags = await Promise.all(
						tagNames.map((name: string) =>
							prisma.questionTag.upsert({
								where: { name },
								update: {},
								create: { name },
							})
						)
					)

					// Create question
					const question = await prisma.question.create({
						data: {
							createdById: user.id,
							courseId,
							type: 'SINGLE_CHOICE',
							difficulty: q.difficulty || 'MEDIUM',
							body: q.body.trim(),
							explanation: q.explanation || null,
							marks: new Decimal(marks),
							isActive: true,
							options: {
								create: optionTexts.map((text: string, idx: number) => ({
									body: text.trim(),
									isCorrect: idx === correctIdx,
									order: idx,
								})),
							},
							tags: {
								create: tags.map((tag) => ({
									tagId: tag.id,
								})),
							},
						},
					})

					imported.push(question.id)
				} catch (err) {
					errors.push(`Question ${idx + 1}: ${err instanceof Error ? err.message : 'Failed to create'}`)
				}
			}

			return {
				success: true,
				imported: imported.length,
				errors: errors.length > 0 ? errors : undefined,
			}
		} catch (err) {
			console.error('Import error:', err)
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to import questions',
			})
		}
	},
}