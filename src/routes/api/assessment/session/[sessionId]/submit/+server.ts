// src/routes/api/assessment/session/[sessionId]/submit/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { submitSession } from '$lib/server/assessments/engine'
import { getPrismaClient } from '$lib/server/db/index.js'
import { audit } from '$lib/server/audit'

export const POST: RequestHandler = async ({ locals, params }) => {
	const student = await requireStudent(locals.user)
	const { sessionId } = params

	const prisma = await getPrismaClient()
	const session = await prisma.assessmentSession.findUnique({
		where: { id: sessionId },
		include: { assessment: true },
	})
	if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')

	// ── Idempotency guard ────────────────────────────────────────────────────
	// If the session is already closed (double-tap, network retry, race),
	// return the existing result rather than attempting a second submission.
	if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(session.status)) {
		const existing = await prisma.assessmentResult.findUnique({
			where: { sessionId },
		})
		return json({
			submitted: true,
			alreadySubmitted: true,
			percentage: existing && session.assessment.showResultImmediately ? Number(existing.percentage) : undefined,
			grade: existing && session.assessment.showResultImmediately ? existing.grade : undefined,
			passed: existing && session.assessment.showResultImmediately ? existing.passed : undefined,
		})
	}

	const result = await submitSession(sessionId, 'MANUAL')

	await audit.student(student.id, 'SESSION_SUBMITTED', 'AssessmentSession', {
		entityId: sessionId,
		afterData: result,
	})

	return json({
		submitted: true,
		percentage: result.isReleased ? result.percentage : undefined,
		grade: result.isReleased ? result.grade : undefined,
		passed: result.isReleased ? result.passed : undefined,
	})
}