// src/routes/(student)/student/tests/[sessionId]/review/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'
import { shuffleArray } from '$lib/utils/shuffle'

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
			result: true,
		},
	})

	if (!session || session.studentId !== student.id) {
		throw error(404, 'Session not found')
	}

	// Only allow review of completed (terminal) sessions
	if (!['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
		throw error(403, 'Can only review completed attempts')
	}

	// Check if lecturer configured review access
	if (!session.assessment.reviewPreviousAttempts && session.status !== 'SUBMITTED') {
		throw error(403, 'Lecturer has not enabled review access for this assessment type')
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
		isCorrect: boolean | null
		marksAwarded: number | null
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
				isCorrect: existing?.isCorrect ?? null,
				marksAwarded: existing?.marksAwarded ? Number(existing.marksAwarded) : null,
			}
		})
	)

	return {
		sessionId: session.id,
		status: session.status,
		submittedAt: session.submittedAt,
		assessment: {
			id: session.assessment.id,
			title: session.assessment.title,
			type: session.assessment.type,
			instructions: session.assessment.instructions,
			durationMinutes: session.assessment.durationMinutes,
			totalMarks: session.assessment.totalMarks.toString(),
			passMark: session.assessment.passMark.toString(),
			questionCount: session.assessment.questionCount,
			course: { code: session.assessment.course.code, title: session.assessment.course.title },
		},
		result: session.result
			? {
					marksObtained: session.result.marksObtained.toString(),
					totalMarks: session.result.totalMarks.toString(),
					percentage: session.result.percentage.toString(),
					grade: session.result.grade,
					gradePoints: session.result.gradePoints.toString(),
					passed: session.result.passed,
				}
			: null,
		questions,
	}
}