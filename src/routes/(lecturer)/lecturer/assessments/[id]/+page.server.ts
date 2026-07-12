// src/routes/(lecturer)/lecturer/assessments/[id]/+page.server.ts
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

// Statuses from which cancellation is allowed (if no sessions exist).
const CANCELLABLE_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ACTIVE']

export const actions: Actions = {
	schedule: async ({ params, request, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (assessment.status !== 'DRAFT') {
			return fail(400, { error: 'Only draft assessments can be scheduled' })
		}

		const form = await request.formData()
		const startTimeStr = form.get('startTime')?.toString()
		const endTimeStr = form.get('endTime')?.toString()

		if (!startTimeStr || !endTimeStr) {
			return fail(400, { error: 'Start and end times are required' })
		}

		const startTime = new Date(startTimeStr)
		const endTime = new Date(endTimeStr)

		if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
			return fail(400, { error: 'Invalid date/time format' })
		}

		if (endTime <= startTime) {
			return fail(400, { error: 'End time must be after start time' })
		}

		const now = new Date()
		if (startTime <= now) {
			return fail(400, { error: 'Start time must be in the future' })
		}

		await prisma.assessment.update({
			where: { id: assessment.id },
			data: { status: 'SCHEDULED', startTime, endTime },
		})

		return { success: true, status: 'SCHEDULED' }
	},

	publish: async ({ params, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
			include: { questions: true },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (assessment.status !== 'DRAFT' && assessment.status !== 'SCHEDULED') {
			return fail(400, { error: 'Only draft or scheduled assessments can be published' })
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

		// If the window is already open, mark ACTIVE; otherwise PUBLISHED.
		const now = new Date()
		const status = assessment.startTime <= now && assessment.endTime > now ? 'ACTIVE' : 'PUBLISHED'

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
		if (!['PUBLISHED', 'SCHEDULED', 'ACTIVE', 'ENDED'].includes(assessment.status)) {
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

	cancel: async ({ params, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })
		if (!CANCELLABLE_STATUSES.includes(assessment.status)) {
			return fail(400, { error: `Cannot cancel a ${assessment.status} assessment` })
		}

		const sessionCount = await prisma.assessmentSession.count({
			where: { assessmentId: assessment.id },
		})
		if (sessionCount > 0) {
			return fail(400, {
				error: 'Cannot cancel — students have already started or submitted attempts',
			})
		}

		await prisma.assessment.update({
			where: { id: assessment.id },
			data: { status: 'CANCELLED' },
		})

		return { success: true, status: 'CANCELLED' }
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