import type { PageServerLoad } from './$types'
import { error, redirect } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'
import { shuffleArray } from '$lib/utils/shuffle'

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

	// Already-written test: bounce straight to the result page. This closes
	// off re-entry into any part of the exam flow (lobby/terms/kiosk) for a
	// session that has already reached a terminal state.
	if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
		throw redirect(303, `/student/tests/${session.id}/result`)
	}

	const faceDescriptor = await prisma.faceDescriptor.findUnique({
		where: { studentId: student.id },
	})

	const answerMap = new Map(session.answers.map((a) => [a.questionId, a]))

	type ExamOption = { id: string; body: string; imageUrl: string | null }

	// Explicit shape for each question sent to the client. Annotating the
	// map callback below with this return type means TypeScript locks in
	// this shape no matter what — so an unrelated type error elsewhere in
	// the callback (e.g. a Prisma model name that doesn't match your
	// schema) can never again cause the whole `questions` array to
	// collapse to `{}[]` and break every `q.foo` access downstream in
	// +page.svelte.
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

	// NOTE on question-level shuffling: the *order of questions themselves*
	// (session.questionOrder, sorted by `position`) is assigned once, when
	// these rows are first created for the session — that's almost certainly
	// in a "start test" / "create session" server action elsewhere in the
	// codebase, not in this loader. If that code assigns `position`
	// sequentially instead of over a shuffled question list, that's where to
	// fix it, e.g.:
	//
	//   const shuffledQuestions = shuffleArray(bankQuestions)
	//   await prisma.sessionQuestionOrder.createMany({
	//     data: shuffledQuestions.map((q, i) => ({
	//       sessionId: session.id,
	//       questionId: q.id,
	//       position: i,
	//       optionOrder: shuffleArray(q.options.map((o) => o.id)),
	//     })),
	//   })
	//
	// This loader only *reads* whatever order was stored at creation time.
	//
	// What we CAN fix here defensively: option order. Previously, if
	// `optionOrder` was ever missing or stale (e.g. legacy rows, or a bug
	// upstream), the code silently fell back to the raw (unshuffled)
	// `q.options` array — meaning "correct answer is always listed first"
	// could leak through in practice. Below we self-heal: if the stored
	// order doesn't match the current option set, shuffle once and persist
	// it, so the fix is permanent and the order stays stable across reloads
	// and resumes rather than re-shuffling on every request.
	// Persisting a healed option order is best-effort and isolated in its own
	// function with its own try/catch: if the model name below doesn't match
	// your schema, or the write fails for any other reason, that failure is
	// contained here — it can't affect the type or the value of `questions`,
	// and the shuffled order the student sees this request is still correct
	// even if it isn't saved (it'll just self-heal again on the next load).
	async function persistHealedOptionOrder(sqoId: string, orderIds: string[]) {
		try {
			// Rename `sessionQuestionOrder` to match your actual Prisma model
			// name for the session-question join table if it differs.
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