// src/routes/(lecturer)/lecturer/assessments/edit/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { Decimal } from 'decimal.js'

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const assessment = await prisma.assessment.findUnique({
		where: { id: params.id },
		include: {
			course: { select: { id: true, code: true, title: true } },
			questions: {
				include: {
					question: {
						include: { options: { orderBy: { order: 'asc' } } },
					},
				},
				orderBy: { order: 'asc' },
			},
			tags: { include: { tag: true } },
		},
	})

	if (!assessment) {
		return fail(404, { error: 'Assessment not found' })
	}

	// Verify ownership
	if (assessment.createdById !== user.id) {
		return fail(403, { error: 'You do not have access to this assessment' })
	}

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		assessment: {
			id: assessment.id,
			title: assessment.title,
			instructions: assessment.instructions,
			type: assessment.type,
			status: assessment.status,
			totalMarks: Number(assessment.totalMarks),
			passMark: Number(assessment.passMark),
			durationMinutes: assessment.durationMinutes,
			questionCount: assessment.questionCount,
			shuffleQuestions: assessment.shuffleQuestions,
			shuffleOptions: assessment.shuffleOptions,
			requireFaceVerify: assessment.requireFaceVerify,
			fullscreenRequired: assessment.fullscreenRequired,
			startTime: assessment.startTime?.toISOString() ?? null,
			endTime: assessment.endTime?.toISOString() ?? null,
			dueDate: assessment.dueDate?.toISOString() ?? null,
			allowLateSubmission: assessment.allowLateSubmission,
			latePenaltyPercent: assessment.latePenaltyPercent ? Number(assessment.latePenaltyPercent) : null,
			publishedAt: assessment.publishedAt?.toISOString() ?? null,
			course: assessment.course,
			questions: assessment.questions.map((aq) => ({
				assessmentQuestionId: aq.id,
				questionId: aq.questionId,
				order: aq.order,
				marksOverride: aq.marksOverride ? Number(aq.marksOverride) : null,
				question: {
					id: aq.question.id,
					body: aq.question.body,
					type: aq.question.type,
					difficulty: aq.question.difficulty,
					marks: Number(aq.question.marks),
					options: aq.question.options,
				},
			})),
			tags: assessment.tags.map((t) => t.tag.name),
		},
	}
}

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		const prisma = await getPrismaClient()

		// Verify ownership
		const assessment = await prisma.assessment.findUnique({
			where: { id: params.id },
			select: { createdById: true },
		})

		if (!assessment || assessment.createdById !== user.id) {
			return fail(403, { error: 'You do not have access to this assessment' })
		}

		const title = String(formData.get('title') ?? '').trim()
		const instructions = String(formData.get('instructions') ?? '').trim() || null
		const totalMarks = Number(formData.get('totalMarks') ?? 0)
		const passMark = Number(formData.get('passMark') ?? 0)
		const durationMinutes = Number(formData.get('durationMinutes') ?? 0)

		const errors: Record<string, string> = {}
		if (!title) errors.title = 'Title is required'
		if (totalMarks <= 0) errors.totalMarks = 'Total marks must be greater than 0'
		if (passMark < 0 || passMark > totalMarks) {
			errors.passMark = `Pass mark must be between 0 and ${totalMarks}`
		}
		if (durationMinutes <= 0) errors.durationMinutes = 'Duration must be greater than 0'

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors })
		}

		try {
			const updated = await prisma.assessment.update({
				where: { id: params.id },
				data: {
					title,
					instructions,
					totalMarks: new Decimal(totalMarks),
					passMark: new Decimal(passMark),
					durationMinutes,
				},
			})

			return { success: true, id: updated.id }
		} catch (err) {
			console.error('Update assessment error:', err)
			return fail(500, { error: 'Failed to update assessment' })
		}
	},

	publish: async ({ locals, params }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findUnique({
			where: { id: params.id },
			select: { createdById: true, questionCount: true, questions: { select: { id: true } } },
		})

		if (!assessment || assessment.createdById !== user.id) {
			return fail(403, { error: 'You do not have access to this assessment' })
		}

		if (assessment.questions.length < assessment.questionCount) {
			return fail(400, {
				error: `You have ${assessment.questions.length} questions but need ${assessment.questionCount}. Add more questions or lower the question count.`,
			})
		}

		try {
			const published = await prisma.assessment.update({
				where: { id: params.id },
				data: {
					status: 'PUBLISHED',
					publishedAt: new Date(),
				},
			})

			return { success: true, message: 'Assessment published successfully' }
		} catch (err) {
			console.error('Publish assessment error:', err)
			return fail(500, { error: 'Failed to publish assessment' })
		}
	},

	delete: async ({ locals, params }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findUnique({
			where: { id: params.id },
			select: { createdById: true, status: true },
		})

		if (!assessment || assessment.createdById !== user.id) {
			return fail(403, { error: 'You do not have access to this assessment' })
		}

		if (assessment.status !== 'DRAFT') {
			return fail(400, { error: 'Can only delete draft assessments' })
		}

		try {
			await prisma.assessment.delete({ where: { id: params.id } })
			return { success: true, message: 'Assessment deleted' }
		} catch (err) {
			console.error('Delete assessment error:', err)
			return fail(500, { error: 'Failed to delete assessment' })
		}
	},
}