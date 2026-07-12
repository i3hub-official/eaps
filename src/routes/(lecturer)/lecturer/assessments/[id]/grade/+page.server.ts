// src/routes/lecturer/assessments/[id]/grade/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { error, fail, redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { onResultReleased } from '$lib/server/transcript/onResultReleased.js'

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	const assessment = await prisma.assessment.findFirst({
		where: { id: params.id, createdById: user.id },
		include: { course: true },
	})

	if (!assessment) throw error(404, 'Assessment not found')
	if (assessment.type !== 'TEST') {
		throw error(400, 'Only TEST assessments require manual grading')
	}

	// Fetch all sessions with pending ESSAY answers for this assessment
	const sessions = await prisma.assessmentSession.findMany({
		where: { assessmentId: assessment.id },
		include: {
			student: { select: { id: true, matricNumber: true, firstName: true, lastName: true } },
			answers: {
				where: { question: { type: 'ESSAY' }, isManualGraded: false },
				include: {
					question: {
						select: {
							id: true,
							body: true,
							type: true,
							marks: true,
							difficulty: true,
						},
					},
				},
				orderBy: { createdAt: 'asc' },
			},
			result: { select: { id: true, marksObtained: true, totalMarks: true } },
		},
		orderBy: { createdAt: 'asc' },
	})

	// Filter to only sessions that have at least one pending essay
	const pendingSessions = sessions.filter((s) => s.answers.length > 0)

	if (pendingSessions.length === 0) {
		return {
			assessment: {
				id: assessment.id,
				title: assessment.title,
				type: assessment.type,
				totalMarks: Number(assessment.totalMarks),
				course: { code: assessment.course.code, title: assessment.course.title },
			},
			pendingSessions: [],
			allGraded: true,
		}
	}

	return {
		assessment: {
			id: assessment.id,
			title: assessment.title,
			type: assessment.type,
			totalMarks: Number(assessment.totalMarks),
			course: { code: assessment.course.code, title: assessment.course.title },
		},
		pendingSessions: pendingSessions.map((s) => ({
			sessionId: s.id,
			studentId: s.student.id,
			matricNumber: s.student.matricNumber,
			studentName: `${s.student.firstName} ${s.student.lastName}`,
			essayCount: s.answers.length,
			answers: s.answers.map((a) => ({
				answerId: a.id,
				questionId: a.question.id,
				questionBody: a.question.body,
				marks: Number(a.question.marks),
				difficulty: a.question.difficulty,
				textAnswer: a.textAnswer,
				currentMarks: a.marksAwarded,
			})),
			result: s.result ? { id: s.result.id, marksObtained: Number(s.result.marksObtained) } : null,
		})),
		allGraded: false,
	}
}

export const actions: Actions = {
	submitGrades: async ({ params, request, locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessment = await prisma.assessment.findFirst({
			where: { id: params.id, createdById: user.id },
		})
		if (!assessment) return fail(404, { error: 'Assessment not found' })

		const form = await request.formData()
		const gradesJson = form.get('grades')?.toString()
		if (!gradesJson) return fail(400, { error: 'No grades submitted' })

		let grades: Record<string, number>
		try {
			grades = JSON.parse(gradesJson)
		} catch {
			return fail(400, { error: 'Invalid grades format' })
		}

		// Update each answer with the grade + metadata
		const updates: Promise<unknown>[] = []
		for (const [answerId, marksAwarded] of Object.entries(grades)) {
			const marks = Number(marksAwarded)
			if (isNaN(marks) || marks < 0) {
				return fail(400, { error: `Invalid marks for answer ${answerId}` })
			}

			updates.push(
				prisma.studentAnswer.update({
					where: { id: answerId },
					data: {
						marksAwarded: marks,
						isCorrect: marks > 0,
						isManualGraded: true,
						gradedAt: new Date(),
						gradedById: user.id,
					},
				}),
			)
		}

		await Promise.all(updates)

		// Find all sessions that had pending essays and check if they're now fully graded
		const sessionsToCheck = await prisma.assessmentSession.findMany({
			where: {
				assessmentId: assessment.id,
				answers: {
					some: {
						id: { in: Object.keys(grades) },
					},
				},
			},
			distinct: ['id'],
			select: { id: true },
		})

		// For each session, check if all essays are now graded
		const releasableResults: string[] = []
		for (const session of sessionsToCheck) {
			const pendingEssays = await prisma.studentAnswer.count({
				where: {
					session: { id: session.id },
					question: { type: 'ESSAY' },
					isManualGraded: false,
				},
			})

			if (pendingEssays === 0) {
				// All essays graded — compute total and release
				const allAnswers = await prisma.studentAnswer.findMany({
					where: { session: { id: session.id } },
					select: { marksAwarded: true, question: { select: { marks: true } } },
				})

				const totalMarksAwarded = allAnswers.reduce((sum, a) => sum + Number(a.marksAwarded), 0)
				const totalMarks = Number(assessment.totalMarks)
				const percentage =
					totalMarks > 0 ? Number(((totalMarksAwarded / totalMarks) * 100).toFixed(2)) : 0

				// Resolve grade
				const gradeRow = await prisma.gradeScale.findFirst({
					where: { minPercent: { lte: percentage }, maxPercent: { gte: percentage } },
				})
				if (!gradeRow) {
					return fail(422, {
						error: `Cannot release — no GradeScale band covers ${percentage}%`,
					})
				}

				const sessionData = await prisma.assessmentSession.findUnique({
					where: { id: session.id },
					select: { studentId: true, assessmentId: true },
				})
				if (!sessionData) continue

				const passed = Number(assessment.passMark) <= totalMarksAwarded

				const result = await prisma.assessmentResult.upsert({
					where: { sessionId: session.id },
					create: {
						sessionId: session.id,
						assessmentId: sessionData.assessmentId,
						studentId: sessionData.studentId,
						totalMarks,
						marksObtained: totalMarksAwarded,
						percentage,
						grade: gradeRow.label,
						gradePoints: Number(gradeRow.points),
						passed,
						isReleased: true,
						releasedAt: new Date(),
						releasedById: user.id,
					},
					update: {
						marksObtained: totalMarksAwarded,
						percentage,
						grade: gradeRow.label,
						gradePoints: Number(gradeRow.points),
						passed,
						isReleased: true,
						releasedAt: new Date(),
						releasedById: user.id,
					},
				})

				releasableResults.push(result.id)
			}
		}

		// Trigger transcript finalization for any newly released results
		for (const resultId of releasableResults) {
			await onResultReleased(resultId)
		}

		return {
			success: true,
			graded: Object.keys(grades).length,
			released: releasableResults.length,
		}
	},
}