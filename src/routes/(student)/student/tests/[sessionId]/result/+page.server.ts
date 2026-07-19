import type { PageServerLoad } from './$types'
import { error, redirect } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: PageServerLoad = async ({ locals, params }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient()

	const session = await prisma.assessmentSession.findUnique({
		where: { id: params.sessionId },
		include: {
			assessment: { include: { course: true } },
			answers: { include: { question: { include: { options: true } } } },
			result: true,
		},
	})

	if (!session || session.studentId !== student.id) {
		throw error(404, 'Session not found')
	}

	// A session that hasn't reached a terminal state has no result yet —
	// send the student back into the exam flow rather than showing a blank
	// or fabricated result page.
	if (!['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
		throw redirect(303, `/student/tests/${session.id}`)
	}

	let result = session.result

	// Defensive fallback: if the submit endpoint didn't create a result row
	// (e.g. a crash between grading and the write, or an auto-submit path
	// that skipped it), compute and persist one now so this page always has
	// something authoritative to show.
	if (!result) {
		let earned = 0
		let total = 0

		for (const answer of session.answers) {
			const q = answer.question
			const marks = Number(q.marks)
			total += marks

			const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id)

			if (q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE') {
				const selected = (answer.selectedOptions as string[] | null) ?? []
				if (selected.length === 1 && correctOptionIds.includes(selected[0])) earned += marks
			} else if (q.type === 'MULTIPLE_CHOICE') {
				const selected = new Set((answer.selectedOptions as string[] | null) ?? [])
				const correct = new Set(correctOptionIds)
				const exact =
					selected.size === correct.size && [...selected].every((id) => correct.has(id))
				if (exact) earned += marks
			}
			// ESSAY/FILL_BLANK/ORDERING/MATCHING require manual or
			// answer-key comparison not modeled here — they contribute 0
			// automatically and should be reconciled against your real
			// grading logic before relying on this fallback in production.
		}

		const percentage = total > 0 ? (earned / total) * 100 : 0
		const passMark = Number(session.assessment.passMark)
		const passed = percentage >= passMark

		// NOTE: field names below (marksObtained / totalMarks / isReleased)
		// match the AssessmentResult shape used elsewhere in this app (see
		// the previousAttempts query on the test-taking page, which selects
		// marksObtained/totalMarks/percentage/grade/isReleased). There is no
		// `score` or `releasedAt` field on this model — using those names
		// silently produces `undefined` rather than an error, which is what
		// caused the NaN score on this page.
		result = await prisma.assessmentResult.upsert({
			where: { sessionId: session.id },
			update: {
				marksObtained: earned,
				totalMarks: total,
				percentage,
				passed,
			},
			create: {
				sessionId: session.id,
				studentId: student.id,
				assessmentId: session.assessmentId,
				marksObtained: earned,
				totalMarks: total,
				percentage,
				passed,
			},
		})
	}

	// ─── Time used ────────────────────────────────────────────────────────
	// startedAt is stamped when the student first accepts terms (see
	// acceptTerms action) or enters kiosk mode; submittedAt is stamped by
	// the submit endpoint (manual or auto-submit on timeout/disqualify).
	// Both should be present for any terminal-status session, but guard
	// against nulls defensively rather than crashing the result page.
	let timeUsedSeconds: number | null = null
	if (session.startedAt && session.submittedAt) {
		timeUsedSeconds = Math.max(
			0,
			Math.round((session.submittedAt.getTime() - session.startedAt.getTime()) / 1000)
		)
	}

	return {
		status: session.status,
		assessment: {
			title: session.assessment.title,
			totalMarks: session.assessment.totalMarks.toString(),
			passMark: session.assessment.passMark.toString(),
			allowReview: session.assessment.allowReview,
			durationMinutes: session.assessment.durationMinutes,
			course: { code: session.assessment.course.code, title: session.assessment.course.title },
		},
		result: {
			score: Number(result.marksObtained),
			totalMarks: Number(result.totalMarks),
			percentage: Number(result.percentage).toFixed(1),
			passed: result.passed,
			released: Boolean(result.isReleased) || session.status !== 'SUBMITTED',
		},
		timeUsedSeconds,
	}
}