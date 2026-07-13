// src/routes/(student)/student/tests/[sessionId]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error, redirect } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'
import { shuffleArray } from '$lib/utils/shuffle'

const RESUME_REVERIFY_THRESHOLD_MINUTES = 5

export const load: PageServerLoad = async ({ locals, params }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient()

	const session = await prisma.assessmentSession.findUnique({
		where: { id: params.sessionId },
		include: {
			assessment: { include: { course: true } },
			questionOrder: {
				orderBy: { position: 'asc' },
				include: { question: { include: { options: true } } },
			},
			answers: true,
		},
	})

	if (!session || session.studentId !== student.id) {
		throw error(404, 'Session not found')
	}

	// Already-written test: bounce straight to the result page
	if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
		throw redirect(303, `/student/tests/${session.id}/result`)
	}

	const faceDescriptor = await prisma.faceDescriptor.findUnique({
		where: { studentId: student.id },
	})

	// ─── Attempt Management ─────────────────────────────────────────────────
	// Get all previous completed attempts for this assessment
const previousAttempts = await prisma.assessmentSession.findMany({
		where: {
			studentId: student.id,
			assessmentId: session.assessment.id,
			status: { in: ['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'] },
		},
		select: {
			id: true,
			status: true,
			submittedAt: true,
			// score/totalMarks/percentage live on the related AssessmentResult,
			// not on AssessmentSession itself — same shape as bestSession.result.*
			// in src/routes/student/tests/+page.server.ts.
			result: {
				select: {
					marksObtained: true,
					totalMarks: true,
					percentage: true,
					grade: true,
					isReleased: true,
				},
			},
		},
		orderBy: { submittedAt: 'desc' },
	})

	// Check attempt limits
	const attemptInfo = {
		attemptNumber: previousAttempts.length + 1,
		maxAttempts: session.assessment.maxAttempts,
		allowRetakes: session.assessment.allowRetakes,
		attemptsRemaining: session.assessment.maxAttempts
			? Math.max(0, session.assessment.maxAttempts - previousAttempts.length)
			: null,
		canAttempt: true,
		canRetake: true,
		retakeBlockedUntil: null as Date | null,
		attemptLimitReached: false,
		previousAttempts: [] as typeof previousAttempts,
	}

	// Check if max attempts reached
	if (
		session.assessment.maxAttempts &&
		previousAttempts.length >= session.assessment.maxAttempts
	) {
		attemptInfo.attemptLimitReached = true
		attemptInfo.canAttempt = false
		attemptInfo.canRetake = false
		throw error(403, 'Maximum attempts reached for this assessment')
	}

	// Check retake delay
	if (previousAttempts.length > 0 && session.assessment.retakeDelayMinutes > 0) {
		const lastAttempt = previousAttempts[0]
		const timeSinceLastAttempt = Date.now() - (lastAttempt.submittedAt?.getTime() ?? 0)
		const delayMs = session.assessment.retakeDelayMinutes * 60 * 1000
		
		if (timeSinceLastAttempt < delayMs) {
			attemptInfo.canRetake = false
			attemptInfo.retakeBlockedUntil = new Date(
				(lastAttempt.submittedAt?.getTime() ?? 0) + delayMs
			)
			throw error(403, 
				`You must wait ${session.assessment.retakeDelayMinutes} minutes between attempts. ` +
				`Next attempt available at ${attemptInfo.retakeBlockedUntil.toLocaleTimeString()}`
			)
		}
	}

	// Include previous attempts only if configured to show
	if (session.assessment.showPreviousAttempts) {
		attemptInfo.previousAttempts = previousAttempts
	}

	const answerMap = new Map(session.answers.map((a) => [a.questionId, a]))

	type ExamOption = { id: string; body: string; imageUrl: string | null }

	type ExamQuestion = {
		position: number
		questionId: string
		type: string
		body: string
		imageUrl: string | null
		marks: number
		options: ExamOption[]
		leftItems: string[] | undefined
		selectedOptions: string[]
		textAnswer: string
		orderAnswer: string[]
		matchAnswer: Record<string, string>
	}

	async function persistHealedOptionOrder(sqoId: string, orderIds: string[]) {
		try {
			await prisma.sessionQuestionOrder.update({
				where: { id: sqoId },
				data: { optionOrder: orderIds },
			})
		} catch (err) {
			console.error('Failed to persist healed option order for', sqoId, err)
		}
	}

	const questions: ExamQuestion[] = await Promise.all(
		session.questionOrder.map(async (sqo): Promise<ExamQuestion> => {
			const q = sqo.question
			let orderIds = (sqo.optionOrder as string[] | null) ?? []

			const validIds = new Set(q.options.map((o) => o.id))
			const isStale = orderIds.length !== q.options.length || orderIds.some((id) => !validIds.has(id))

			if (isStale) {
				orderIds = shuffleArray(q.options.map((o) => o.id))
				await persistHealedOptionOrder(sqo.id, orderIds)
			}

			const optionsById = new Map(q.options.map((o) => [o.id, o]))
			const orderedOptions = orderIds
				.map((id) => optionsById.get(id))
				.filter((o): o is NonNullable<typeof o> => Boolean(o))

			const existing = answerMap.get(q.id)

			return {
				position: sqo.position,
				questionId: q.id,
				type: q.type,
				body: q.body,
				imageUrl: q.imageUrl,
				marks: Number(q.marks),
				options: orderedOptions.map((o) => ({ id: o.id, body: o.body, imageUrl: o.imageUrl })),
				leftItems: q.type === 'MATCHING' ? orderedOptions.map((o) => o.body) : undefined,
				selectedOptions: (existing?.selectedOptions as string[] | null) ?? [],
				textAnswer: existing?.textAnswer ?? '',
				orderAnswer: (existing?.orderAnswer as string[] | null) ?? orderedOptions.map((o) => o.id),
				matchAnswer: (existing?.matchAnswer as Record<string, string> | null) ?? {},
			}
		})
	)

	let needsReverify = false
	if (
		session.assessment.requireFaceVerify &&
		(session.status === 'IN_PROGRESS' || session.status === 'PAUSED')
	) {
		const lastActivity = session.lastSyncAt ?? session.startedAt ?? session.createdAt
		const idleMinutes = (Date.now() - lastActivity.getTime()) / 60_000
		needsReverify = idleMinutes > RESUME_REVERIFY_THRESHOLD_MINUTES
	}

	return {
		sessionId: session.id,
		status: session.status,
		expiresAt: session.expiresAt,
		timeRemainingSeconds: session.timeRemainingSeconds,
		termsAcceptedAt: session.termsAcceptedAt,
		faceVerifiedAt: session.faceVerifiedAt,
		faceEnrolled: Boolean(faceDescriptor),
		needsReverify,
		attemptInfo,
		assessment: {
			id: session.assessment.id,
			title: session.assessment.title,
			type: session.assessment.type,
			instructions: session.assessment.instructions,
			durationMinutes: session.assessment.durationMinutes,
			totalMarks: session.assessment.totalMarks.toString(),
			passMark: session.assessment.passMark.toString(),
			questionCount: session.assessment.questionCount,
			requireFaceVerify: session.assessment.requireFaceVerify,
			fullscreenRequired: session.assessment.fullscreenRequired,
			allowReview: session.assessment.allowReview,
			// Attempt management fields
			maxAttempts: session.assessment.maxAttempts,
			allowRetakes: session.assessment.allowRetakes,
			retakeDelayMinutes: session.assessment.retakeDelayMinutes,
			showPreviousAttempts: session.assessment.showPreviousAttempts,
			bestScoreOnly: session.assessment.bestScoreOnly,
			reviewPreviousAttempts: session.assessment.reviewPreviousAttempts,
			course: { code: session.assessment.course.code, title: session.assessment.course.title },
		},
		questions,
	}
}