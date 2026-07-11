import type { PageServerLoad, Actions } from './$types'
import { error, fail, redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const assessment = await prisma.assessment.findFirst({
		where: { id: params.id, createdById: user.id },
		include: {
			course: { include: { level: true } },
			questions: {
				include: {
					question: { include: { options: { orderBy: { order: 'asc' } } } },
				},
				orderBy: { order: 'asc' },
			},
			tags: { include: { tag: true } },
			_count: { select: { sessions: true } },
		},
	})

	if (!assessment) throw error(404, 'Assessment not found')

	return {
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
			startTime: assessment.startTime,
			endTime: assessment.endTime,
			maxAttempts: assessment.maxAttempts,
			publishedAt: assessment.publishedAt,
			sessionCount: assessment._count.sessions,
			course: {
				code: assessment.course.code,
				title: assessment.course.title,
				level: assessment.course.level.name,
			},
			tags: assessment.tags.map((t) => t.tag.name),
			questions: assessment.questions.map((aq) => ({
				id: aq.question.id,
				body: aq.question.body,
				type: aq.question.type,
				difficulty: aq.question.difficulty,
				marks: Number(aq.marksOverride ?? aq.question.marks),
			})),
		},
	}
}

// Statuses reachable only after publishing — none of these can be deleted.
const NON_DELETABLE_STATUSES = ['PUBLISHED', 'SCHEDULED', 'ACTIVE', 'ENDED']

export const actions: Actions = {
	publish: async ({ params, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
			include: { questions: true },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (assessment.status !== 'DRAFT') {
			return fail(400, { error: 'Only draft assessments can be published' })
		}
		if (assessment.questions.length === 0) {
			return fail(400, { error: 'Cannot publish an assessment with no questions' })
		}
		if (!assessment.startTime || !assessment.endTime) {
			return fail(400, { error: 'Set a start and end time before publishing' })
		}
		if (assessment.endTime <= assessment.startTime) {
			return fail(400, { error: 'End time must be after start time' })
		}

		// If the window is already open, mark ACTIVE; otherwise SCHEDULED.
		const now = new Date()
		const status = assessment.startTime <= now && assessment.endTime > now ? 'ACTIVE' : 'SCHEDULED'

		await prisma.assessment.update({
			where: { id: assessment.id },
			data: { status, publishedAt: now },
		})

		return { success: true, status }
	},

	unpublish: async ({ params, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (!NON_DELETABLE_STATUSES.includes(assessment.status)) {
			return fail(400, { error: 'Assessment is not published' })
		}

		const sessionCount = await prisma.assessmentSession.count({
			where: { assessmentId: assessment.id },
		})
		if (sessionCount > 0) {
			return fail(400, {
				error: 'Cannot unpublish — students have already started or submitted attempts',
			})
		}

		await prisma.assessment.update({
			where: { id: assessment.id },
			data: { status: 'DRAFT', publishedAt: null },
		})

		return { success: true, status: 'DRAFT' }
	},

	delete: async ({ params, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (NON_DELETABLE_STATUSES.includes(assessment.status)) {
			return fail(403, { error: 'Published assessments cannot be deleted. Unpublish it first.' })
		}

		await prisma.$transaction([
			prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } }),
			prisma.assessmentTag.deleteMany({ where: { assessmentId: assessment.id } }),
			prisma.assessmentEligibility.deleteMany({ where: { assessmentId: assessment.id } }),
			prisma.assessmentInvigilator.deleteMany({ where: { assessmentId: assessment.id } }),
			prisma.assessment.delete({ where: { id: assessment.id } }),
		])

		throw redirect(303, '/lecturer/assessments')
	},
}