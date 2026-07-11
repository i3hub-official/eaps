// src/routes/(student)/student/tests/[sessionId]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

// A resumed IN_PROGRESS/PAUSED session skips lobby/terms and returns
// straight to the kiosk — UNLESS the last known activity (lastSyncAt,
// updated every ~20s while the kiosk tab is genuinely open) is older than
// this threshold. Past that, we can no longer be confident the same
// person is still at the keyboard, so face re-verification is required
// again before re-entering the kiosk. Terms are not re-shown — consent
// doesn't expire the same way presence does.
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

	const faceDescriptor = await prisma.faceDescriptor.findUnique({
		where: { studentId: student.id },
	})

	const answerMap = new Map(session.answers.map((a) => [a.questionId, a]))

	const questions = session.questionOrder.map((sqo) => {
		const q = sqo.question
		const orderIds = (sqo.optionOrder as string[]) ?? []
		const optionsById = new Map(q.options.map((o) => [o.id, o]))
		const orderedOptions = orderIds.length
			? (orderIds.map((id) => optionsById.get(id)).filter(Boolean) as typeof q.options)
			: q.options

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

	// Determine whether a resumed session needs face re-verification.
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
			course: { code: session.assessment.course.code, title: session.assessment.course.title },
		},
		questions,
	}
}