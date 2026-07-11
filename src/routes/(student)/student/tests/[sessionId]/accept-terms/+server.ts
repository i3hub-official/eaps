// src/routes/api/assessment/session/[sessionId]/accept-terms/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireStudent } from '$lib/server/auth/guards'
import { getPrismaClient } from '$lib/server/db/index.js'

export const POST: RequestHandler = async ({ locals, params }) => {
	const student = await requireStudent(locals.user)
	const { sessionId } = params

	const prisma = await getPrismaClient()
	const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
	if (!session || session.studentId !== student.id) throw error(403, 'Forbidden')
	if (!['PENDING', 'IN_PROGRESS', 'PAUSED'].includes(session.status)) {
		throw error(400, 'Session is not active')
	}

	const updated = await prisma.assessmentSession.update({
		where: { id: sessionId },
		data: { termsAcceptedAt: new Date() },
	})

	return json({ termsAcceptedAt: updated.termsAcceptedAt })
}