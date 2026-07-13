// src/routes/api/assessment/session/create/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const student = await requireStudent(locals.user)
		const prisma = await getPrismaClient()

		const body = await request.json()
		const { assessmentId } = body

		if (!assessmentId) {
			return json(
				{ error: 'Assessment ID is required' },
				{ status: 400 }
			)
		}

		// Get assessment with attempt config
		const assessment = await prisma.assessment.findUnique({
			where: { id: assessmentId },
		})

		if (!assessment) {
			return json(
				{ error: 'Assessment not found' },
				{ status: 404 }
			)
		}

		// Check if student is enrolled in this course
		const enrollment = await prisma.enrollment.findFirst({
			where: {
				studentId: student.id,
				courseId: assessment.courseId,
			},
		})

		if (!enrollment) {
			return json(
				{ error: 'You are not enrolled in this course' },
				{ status: 403 }
			)
		}

		// Get all previous attempts (completed sessions)
		const previousAttempts = await prisma.assessmentSession.findMany({
			where: {
				studentId: student.id,
				assessmentId: assessmentId,
				status: { in: ['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'] },
			},
			select: { id: true, submittedAt: true },
			orderBy: { submittedAt: 'desc' },
		})

		// ─── Attempt Limit Check ──────────────────────────────────────────
		if (assessment.maxAttempts && previousAttempts.length >= assessment.maxAttempts) {
			return json(
				{ 
					error: 'Maximum attempts reached',
					attemptLimitReached: true,
				},
				{ status: 403 }
			)
		}

		// ─── Retake Delay Check ───────────────────────────────────────────
		if (previousAttempts.length > 0 && assessment.retakeDelayMinutes > 0) {
			const lastAttempt = previousAttempts[0]
			const timeSinceLastAttempt = Date.now() - (lastAttempt.submittedAt?.getTime() ?? 0)
			const delayMs = assessment.retakeDelayMinutes * 60 * 1000

			if (timeSinceLastAttempt < delayMs) {
				const nextAvailableTime = new Date(
					(lastAttempt.submittedAt?.getTime() ?? 0) + delayMs
				)
				return json(
					{
						error: `You must wait ${assessment.retakeDelayMinutes} minutes between attempts`,
						retakeBlockedUntil: nextAvailableTime.toISOString(),
						minutesRemaining: Math.ceil((delayMs - timeSinceLastAttempt) / 60000),
					},
					{ status: 429 } // Too Many Requests
				)
			}
		}

		// ─── Create New Session ───────────────────────────────────────────
		// Get all questions for this assessment and shuffle them
		const questions = await prisma.question.findMany({
			where: { assessmentId: assessmentId },
			include: { options: true },
		})

		if (questions.length === 0) {
			return json(
				{ error: 'Assessment has no questions' },
				{ status: 400 }
			)
		}

		const shuffledQuestions = questions.sort(() => Math.random() - 0.5)

		// Create new session
		const newSession = await prisma.assessmentSession.create({
			data: {
				studentId: student.id,
				assessmentId: assessmentId,
				status: 'NOT_STARTED',
				expiresAt: new Date(Date.now() + assessment.durationMinutes * 60 * 1000),
				questionOrder: {
					createMany: {
						data: shuffledQuestions.map((q, index) => ({
							questionId: q.id,
							position: index,
							optionOrder: q.options.map(o => o.id).sort(() => Math.random() - 0.5),
						})),
					},
				},
			},
		})

		return json({
			success: true,
			sessionId: newSession.id,
			attemptNumber: previousAttempts.length + 1,
		})
	} catch (err) {
		console.error('Failed to create assessment session:', err)
		return json(
			{ error: 'Failed to create session' },
			{ status: 500 }
		)
	}
}