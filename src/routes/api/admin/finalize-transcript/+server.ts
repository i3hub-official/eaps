// src/routes/api/admin/finalize-transcript/+server.ts
//
// Manual finalize / force re-run for a single (studentId, courseId,
// sessionId) transcript entry. Restricted to SUPER_ADMIN — this writes the
// official transcript record, so it isn't exposed to exam officers,
// lecturers, or any other staff role. Auto-finalization (on TEST/EXAM
// release) already handles the normal path; this exists for correction
// cases — e.g. a result was revised after the transcript was already
// finalized, and someone needs to explicitly force a recompute.

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { finalizeTranscriptEntry } from '$lib/server/transcript/finalize.js'

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user
	if (!user || user.type !== 'staff' || user.primaryRole !== 'SUPER_ADMIN') {
		throw error(403, 'Only an administrator can finalize or re-run a transcript entry.')
	}

	const body = await request.json().catch(() => null)
	const studentId = typeof body?.studentId === 'string' ? body.studentId : null
	const courseId = typeof body?.courseId === 'string' ? body.courseId : null
	const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null

	if (!studentId || !courseId || !sessionId) {
		throw error(400, 'studentId, courseId, and sessionId are all required.')
	}

	// forceRecompute is always true on this manual path — the whole point
	// of an admin hitting this endpoint is to override/re-run, not to
	// no-op against an already-finalized entry the way the automatic
	// trigger does.
	const outcome = await finalizeTranscriptEntry({
		studentId,
		courseId,
		sessionId,
		forceRecompute: true,
	})

	if (outcome.status === 'not_ready') {
		throw error(422, outcome.reason)
	}

	return json({ success: true, outcome })
}