// src/routes/(student)/student/results/[resultId]/review/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

// AssessmentType enum order (schema.prisma) — used to sort tabs consistently
// regardless of DB return order: practice first (lowest stakes), exam last.
const TYPE_ORDER = ['PRACTICE', 'ASSIGNMENT', 'TEST', 'EXAMINATION'] as const

export const load: PageServerLoad = async ({ locals, params }) => {
	const student = await requireStudent(locals.user)
	const prisma = await getPrismaClient()

	// Anchor result — determines which course we're reviewing and enforces
	// ownership (404s immediately if this result isn't the requesting
	// student's, before we go fetch anything else for the course).
	const anchor = await prisma.assessmentResult.findUnique({
		where: { id: params.resultId },
		include: { assessment: { include: { course: true } } },
	})

	if (!anchor || anchor.studentId !== student.id) {
		throw error(404, 'Result not found')
	}

	const courseId = anchor.assessment.courseId

	// Every released, review-enabled result this student has for this
	// course — not just the one in the URL — so results of different
	// assessment types (Practice / Assignment / Test / Examination) can be
	// grouped into tabs. Each result is 1:1 with an AssessmentSession
	// (AssessmentResult.sessionId is @unique), which is what actually holds
	// the student's locked-in paper.
	const results = await prisma.assessmentResult.findMany({
		where: {
			studentId: student.id,
			isReleased: true,
			assessment: { courseId, allowReview: true },
		},
		include: {
			assessment: { select: { id: true, type: true, title: true } },
			session: {
				include: {
					// The student's actual locked-in paper for that attempt —
					// position + which question, exactly as they saw it. This is
					// what "only the questions the student took" means: not the
					// assessment's full pool, not a fresh shuffle, but this row set.
					questionOrder: {
						orderBy: { position: 'asc' },
						include: {
							question: { include: { options: true } },
						},
					},
				},
			},
		},
	})

	if (results.length === 0) {
		// The anchor result existed and was owned by this student, but failed
		// the isReleased/allowReview filter above — surface why, same as the
		// single-result version of this check used to.
		if (!anchor.isReleased) throw error(403, 'This result has not been released yet')
		throw error(403, 'Question review is not enabled for this assessment')
	}

	// Group into tabs by assessment type. A student could in principle have
	// more than one released result of the same type for a course (e.g. two
	// TEST attempts) — each becomes its own tab entry so a paper is never
	// silently merged with another attempt's questions.
	const tabs = results
		.map((r) => ({
			resultId: r.id,
			assessmentId: r.assessment.id,
			type: r.assessment.type,
			title: r.assessment.title,
			// No answer/correctness data selected anywhere in this query —
			// options carry only id/body/imageUrl below, never isCorrect.
			questions: (r.session?.questionOrder ?? []).map((sqo) => ({
				id: sqo.question.id,
				position: sqo.position,
				type: sqo.question.type,
				body: sqo.question.body,
				imageUrl: sqo.question.imageUrl,
				marks: Number(sqo.question.marks),
				// optionOrder on SessionQuestionOrder holds the shuffled option-id
				// sequence the student actually saw for THIS question in THIS
				// session — reordering the options list to match it (falling back
				// to stored order if optionOrder is missing/stale) preserves "what
				// they took" rather than re-shuffling on every load.
				options: reorderOptions(sqo.question.options, sqo.optionOrder),
			})),
		}))
		.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))

	return {
		course: anchor.assessment.course
			? { code: anchor.assessment.course.code, title: anchor.assessment.course.title }
			: null,
		activeResultId: params.resultId,
		tabs,
	}
}

function reorderOptions(
	options: { id: string; body: string; imageUrl: string | null }[],
	optionOrderJson: unknown,
): { id: string; body: string; imageUrl: string | null }[] {
	if (!Array.isArray(optionOrderJson)) return options

	const byId = new Map(options.map((o) => [o.id, o]))
	const ordered = optionOrderJson
		.filter((id): id is string => typeof id === 'string' && byId.has(id))
		.map((id) => byId.get(id)!)

	// Stored order didn't cover every option (schema drift / partial data) —
	// fall back to DB order rather than silently dropping options.
	return ordered.length === options.length ? ordered : options
}