// src/lib/server/transcript/onResultReleased.ts
//
// Call this immediately after an AssessmentResult is marked
// isReleased: true (wherever that release action lives in your codebase —
// I don't have that file, so this is the piece you wire in, not a
// replacement for it). Only TEST and EXAMINATION releases can complete a
// transcript entry; PRACTICE/ASSIGNMENT releases are a no-op here.

import { getPrismaClient } from '$lib/server/db/index.js'
import { finalizeTranscriptEntry, type FinalizeOutcome } from './finalize.js'

/**
 * @param resultId  The AssessmentResult.id that was just released.
 * @returns The finalize outcome, or null if this release type doesn't
 *          participate in transcript finalization (PRACTICE/ASSIGNMENT),
 *          or the assessment isn't tied to a session yet.
 */
export async function onResultReleased(resultId: string): Promise<FinalizeOutcome | null> {
	const prisma = await getPrismaClient()

	const result = await prisma.assessmentResult.findUnique({
		where: { id: resultId },
		include: {
			assessment: {
				select: {
					courseId: true,
					type: true,
					course: {
						select: {
							offerings: {
								select: { semester: { select: { sessionId: true } } },
								take: 1,
								orderBy: { createdAt: 'desc' },
							},
						},
					},
				},
			},
		},
	})

	if (!result) return null
	if (result.assessment.type !== 'TEST' && result.assessment.type !== 'EXAMINATION') return null

	const sessionId = result.assessment.course.offerings[0]?.semester.sessionId
	if (!sessionId) return null // no offering/semester resolved — nothing to finalize against yet

	// forceRecompute is deliberately false here — this is the AUTOMATIC
	// path. If a TranscriptEntry is already finalized and, say, a TEST
	// result gets revised and re-released afterward, this will NOT
	// silently overwrite it; that re-run requires the manual admin action
	// (see finalizeTranscript.ts), which is the explicit "override" you
	// asked for.
	return finalizeTranscriptEntry({
		studentId: result.studentId,
		courseId: result.assessment.courseId,
		sessionId,
		forceRecompute: false,
	})
}