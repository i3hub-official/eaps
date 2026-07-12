// src/lib/server/assessments/autoReleaseTest.ts
//
// Called right after a TEST-type AssessmentSession is submitted (student
// hits submit, or the server auto-submits on timeout). Auto-grades the
// objective question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE,
// FILL_BLANK exact-match, ORDERING, MATCHING) and, if every question in
// the session is objective, releases the result immediately with no staff
// action required. If ANY question requires manual grading (ESSAY), release
// is withheld — this is what makes "automatic" safe: it never releases a
// mark that hasn't actually been computed yet.

import { getPrismaClient } from '$lib/server/db/index.js'
import type { QuestionType, GradeLabel } from '@prisma/client'
import { onResultReleased } from '$lib/server/transcript/onResultReleased.js'

// Question types this auto-grader can score without a human. ESSAY is
// deliberately excluded — there is no automatic scoring path for it.
const AUTO_GRADABLE: QuestionType[] = [
	'SINGLE_CHOICE',
	'MULTIPLE_CHOICE',
	'TRUE_FALSE',
	'FILL_BLANK',
	'ORDERING',
	'MATCHING',
]

export type AutoReleaseOutcome =
	| { status: 'released'; resultId: string }
	| { status: 'pending_manual_grading'; essayCount: number }
	| { status: 'not_applicable'; reason: string }

export async function autoReleaseTestSession(sessionId: string): Promise<AutoReleaseOutcome> {
	const prisma = await getPrismaClient()

	const session = await prisma.assessmentSession.findUnique({
		where: { id: sessionId },
		include: {
			assessment: { select: { id: true, type: true, totalMarks: true, passMark: true } },
			answers: { include: { question: { include: { options: true, matchPairs: true } } } },
		},
	})

	if (!session) return { status: 'not_applicable', reason: 'Session not found.' }
	if (session.assessment.type !== 'TEST') {
		return { status: 'not_applicable', reason: 'Auto-release only applies to TEST assessments.' }
	}
	if (session.status !== 'SUBMITTED' && session.status !== 'TIMED_OUT') {
		return { status: 'not_applicable', reason: 'Session has not been submitted yet.' }
	}

	const essayAnswers = session.answers.filter((a) => a.question.type === 'ESSAY')
	if (essayAnswers.length > 0) {
		// Grade whatever CAN be auto-graded now (so a lecturer opening the
		// manual-grading screen later sees objective marks already filled
		// in), but do not release — the total isn't complete until the
		// essay portion is scored by a human.
		await gradeObjectiveAnswers(session.answers.filter((a) => a.question.type !== 'ESSAY'))
		return { status: 'pending_manual_grading', essayCount: essayAnswers.length }
	}

	// Every answer in this session is an auto-gradable type — safe to
	// score the whole session and release immediately.
	const graded = await gradeObjectiveAnswers(session.answers)
	const marksObtained = graded.reduce((sum, g) => sum + g.marksAwarded, 0)
	const totalMarks = Number(session.assessment.totalMarks)
	const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : 0

	const gradeRow = await resolveGrade(percentage)
	if (!gradeRow) {
		// No GradeScale band covers this percentage — can't compute a grade,
		// so we can't responsibly release. Leaves the result ungraded for a
		// human to investigate (this indicates a GradeScale config gap, not
		// a normal "pending" state).
		return {
			status: 'not_applicable',
			reason: `No GradeScale band covers ${percentage}% — cannot auto-release.`,
		}
	}

	const passed = Number(session.assessment.passMark) <= marksObtained

	const result = await prisma.assessmentResult.upsert({
		where: { sessionId: session.id },
		create: {
			sessionId: session.id,
			assessmentId: session.assessmentId,
			studentId: session.studentId,
			totalMarks,
			marksObtained,
			percentage,
			grade: gradeRow.label,
			gradePoints: gradeRow.points,
			passed,
			isReleased: true,
			releasedAt: new Date(),
			releasedById: null,
		},
		update: {
			totalMarks,
			marksObtained,
			percentage,
			grade: gradeRow.label,
			gradePoints: gradeRow.points,
			passed,
			isReleased: true,
			releasedAt: new Date(),
		},
	})

	// Feeds into transcript finalization (TEST half of CA+Exam) — see
	// onResultReleased.ts. Awaited so a finalize failure surfaces here
	// rather than being silently lost after the response is already sent.
	await onResultReleased(result.id)

	return { status: 'released', resultId: result.id }
}

async function gradeObjectiveAnswers(answers: any[]): Promise<{ answerId: string; marksAwarded: number }[]> {
	const prisma = await getPrismaClient()
	const results: { answerId: string; marksAwarded: number }[] = []

	for (const answer of answers) {
		if (!AUTO_GRADABLE.includes(answer.question.type)) continue

		const marksAwarded = scoreAnswer(answer)
		const isCorrect = marksAwarded >= Number(answer.question.marks)

		await prisma.studentAnswer.update({
			where: { id: answer.id },
			data: {
				marksAwarded,
				isCorrect,
				isManualGraded: false,
				gradedAt: new Date(),
			},
		})

		results.push({ answerId: answer.id, marksAwarded })
	}

	return results
}

/**
 * Scores a single objective answer against its question's stored key.
 * Partial credit is not attempted for MULTIPLE_CHOICE/ORDERING/MATCHING —
 * full marks only on an exact match, zero otherwise. If your grading
 * policy wants partial credit, this is the function to extend; I kept it
 * binary since your schema doesn't define a partial-credit scheme.
 */
function scoreAnswer(answer: {
	question: {
		type: QuestionType
		marks: unknown
		options: { id: string; isCorrect: boolean }[]
		matchPairs: { id: string; leftItem: string; rightItem: string }[]
	}
	selectedOptions: unknown
	textAnswer: string | null
	orderAnswer: unknown
	matchAnswer: unknown
}): number {
	const fullMarks = Number(answer.question.marks)

	switch (answer.question.type) {
		case 'SINGLE_CHOICE':
		case 'TRUE_FALSE': {
			const selected = asStringArray(answer.selectedOptions)
			const correctIds = answer.question.options.filter((o) => o.isCorrect).map((o) => o.id)
			const isMatch = selected.length === 1 && correctIds.includes(selected[0])
			return isMatch ? fullMarks : 0
		}

		case 'MULTIPLE_CHOICE': {
			const selected = new Set(asStringArray(answer.selectedOptions))
			const correctIds = new Set(
				answer.question.options.filter((o) => o.isCorrect).map((o) => o.id),
			)
			const exactMatch =
				selected.size === correctIds.size && [...selected].every((id) => correctIds.has(id))
			return exactMatch ? fullMarks : 0
		}

		case 'FILL_BLANK': {
			// Exact-match, case-insensitive, trimmed. No fuzzy/partial credit —
			// genuinely ambiguous fill-blank answers should route to manual
			// grading rather than being auto-scored, but FILL_BLANK doesn't
			// have a "requires manual" flag in the schema, so this is the
			// simplest correct behavior available.
			const correctOption = answer.question.options.find((o) => o.isCorrect)
			if (!correctOption) return 0
			const correctText = (correctOption as unknown as { body?: string }).body
			const given = (answer.textAnswer ?? '').trim().toLowerCase()
			return given && correctText && given === correctText.trim().toLowerCase() ? fullMarks : 0
		}

		case 'ORDERING': {
			const given = asStringArray(answer.orderAnswer)
			const correctOrder = [...answer.question.options]
				.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
				.map((o) => o.id)
			const isMatch =
				given.length === correctOrder.length && given.every((id, i) => id === correctOrder[i])
			return isMatch ? fullMarks : 0
		}

		case 'MATCHING': {
			const given = (answer.matchAnswer ?? {}) as Record<string, string>
			const pairs = answer.question.matchPairs
			if (pairs.length === 0) return 0
			const allCorrect = pairs.every((p) => given[p.leftItem] === p.rightItem)
			return allCorrect ? fullMarks : 0
		}

		default:
			return 0 // ESSAY and anything unrecognized — never auto-scored
	}
}

function asStringArray(json: unknown): string[] {
	if (Array.isArray(json)) return json.filter((x): x is string => typeof x === 'string')
	return []
}

async function resolveGrade(
	percentage: number,
): Promise<{ label: GradeLabel; points: number } | null> {
	const prisma = await getPrismaClient()
	const row = await prisma.gradeScale.findFirst({
		where: { minPercent: { lte: percentage }, maxPercent: { gte: percentage } },
	})
	if (!row) return null
	return { label: row.label, points: Number(row.points) }
}