// src/routes/(lecturer)/lecturer/question-bank/import/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { Decimal } from 'decimal.js'

interface RawQuestion {
	body?: string
	options?: Array<string | { text: string }>
	correct?: string
	correctIndex?: number
	difficulty?: string
	marks?: number | string
	explanation?: string
	tags?: string[]
}

function parseJson(content: string): RawQuestion[] {
	const data = JSON.parse(content)
	return Array.isArray(data) ? data : [data]
}

function parseTxt(content: string): RawQuestion[] {
	const questions: RawQuestion[] = []
	const blocks = content.split(/\n\n+/)

	for (const block of blocks) {
		const lines = block.split('\n').filter((l) => l.trim())
		if (lines.length < 3) continue

		const q: RawQuestion = { body: lines[0].trim(), options: [], tags: [] }

		for (const line of lines.slice(1)) {
			const upper = line.toUpperCase()

			if (/^[A-D]\)/i.test(line)) {
				;(q.options as string[]).push(line.substring(2).trim())
			} else if (upper.startsWith('CORRECT:')) {
				q.correct = line.substring(8).trim().toUpperCase()
			} else if (upper.startsWith('TAGS:')) {
				q.tags = line
					.substring(5)
					.trim()
					.split(',')
					.map((t) => t.trim().toLowerCase())
			} else if (upper.startsWith('DIFFICULTY:')) {
				q.difficulty = line.substring(11).trim().toUpperCase()
			} else if (upper.startsWith('MARKS:')) {
				q.marks = Number(line.substring(6).trim())
			} else if (upper.startsWith('EXPLANATION:')) {
				q.explanation = line.substring(12).trim()
			}
		}

		if ((q.options as string[]).length >= 2) questions.push(q)
	}

	return questions
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		const courseId = String(formData.get('courseId') ?? '').trim()
		const file = formData.get('file') as File | null

		if (!courseId) {
			return json({ success: false, error: 'Course is required' }, { status: 400 })
		}
		if (!file || file.size === 0) {
			return json({ success: false, error: 'File is required' }, { status: 400 })
		}

		const ext = file.name.split('.').pop()?.toLowerCase()
		if (!['json', 'txt'].includes(ext ?? '')) {
			return json({ success: false, error: 'Unsupported file type. Use .json or .txt' }, { status: 400 })
		}
		if (file.size > 5 * 1024 * 1024) {
			return json({ success: false, error: 'File size must be less than 5 MB' }, { status: 400 })
		}

		const prisma = await getPrismaClient()

		const course = await prisma.course.findFirst({
			where: { id: courseId, offerings: { some: { lecturerId: user.id } } },
		})
		if (!course) {
			return json({ success: false, error: 'You do not have access to this course' }, { status: 403 })
		}

		const content = await file.text()
		let rawQuestions: RawQuestion[]

		try {
			rawQuestions = ext === 'json' ? parseJson(content) : parseTxt(content)
		} catch (parseErr) {
			return json(
				{ success: false, error: `Could not parse file: ${parseErr instanceof Error ? parseErr.message : 'invalid format'}` },
				{ status: 400 }
			)
		}

		if (rawQuestions.length === 0) {
			return json({ success: false, error: 'No valid questions found in file' }, { status: 400 })
		}

		let imported = 0
		const errors: string[] = []

		for (let idx = 0; idx < rawQuestions.length; idx++) {
			const q = rawQuestions[idx]
			const label = `Question ${idx + 1}`

			if (!q.body?.trim()) {
				errors.push(`${label}: Missing question text`)
				continue
			}
			if (!q.options || q.options.length < 2) {
				errors.push(`${label}: At least 2 options are required`)
				continue
			}
			if (q.options.length > 4) {
				errors.push(`${label}: Maximum 4 options allowed`)
				continue
			}

			const marks = Number(q.marks) || 1
			if (marks <= 0) {
				errors.push(`${label}: Marks must be greater than 0`)
				continue
			}

			const optionTexts = q.options.map((o) =>
				typeof o === 'string' ? o.trim() : (o as { text: string }).text.trim()
			)

			let correctIdx = -1
			if (q.correct) {
				const letter = q.correct.toUpperCase().charCodeAt(0) - 65
				if (letter >= 0 && letter < optionTexts.length) correctIdx = letter
			} else if (q.correctIndex !== undefined) {
				correctIdx = q.correctIndex
			}

			if (correctIdx === -1) {
				errors.push(`${label}: No correct answer specified`)
				continue
			}

			const tagNames = (q.tags ?? [])
				.map((t) => t.trim().toLowerCase())
				.filter((t) => t.length > 0 && t.length <= 50)
				.slice(0, 10)

			try {
				const tags = await Promise.all(
					tagNames.map((name) =>
						prisma.questionTag.upsert({ where: { name }, update: {}, create: { name } })
					)
				)

				await prisma.question.create({
					data: {
						createdById: user.id,
						courseId,
						type: 'SINGLE_CHOICE',
						difficulty: (q.difficulty ?? 'MEDIUM') as any,
						body: q.body.trim(),
						explanation: q.explanation?.trim() || null,
						marks: new Decimal(marks),
						isActive: true,
						options: {
							create: optionTexts.map((text, i) => ({
								body: text,
								isCorrect: i === correctIdx,
								order: i,
							})),
						},
						tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
					},
				})

				imported++
			} catch (err) {
				errors.push(`${label}: ${err instanceof Error ? err.message : 'Database error'}`)
			}
		}

		// A run with at least one successful import is a 200, even if some rows
		// failed — partial success is not a request failure. Only 0 imported
		// (total failure) returns 400 so the client can show an error state.
		const result = {
			success: imported > 0,
			imported,
			total: rawQuestions.length,
			...(errors.length > 0 && { errors }),
			...(imported === 0 && { error: 'No questions could be imported. Check the format and try again.' }),
		}

		return json(result, { status: imported > 0 ? 200 : 400 })
	} catch (err) {
		console.error('[question-bank/import] error:', err)
		return json(
			{ success: false, error: err instanceof Error ? err.message : 'Import failed' },
			{ status: 500 }
		)
	}
}