// src/lib/server/transcript/finalize.ts
//
// Turns a student's released TEST (CA, 30 marks) + EXAMINATION (70 marks)
// AssessmentResults for one course in one session into a single
// TranscriptEntry — the official record. Practice and Assignment results
// are formative and never feed into this; only TEST and EXAMINATION map to
// the CA(30)+Exam(70)=100 structure TranscriptEntry models.

import { getPrismaClient } from '$lib/server/db/index.js'
import type { GradeLabel } from '@prisma/client'

export type FinalizeOutcome =
	| { status: 'finalized'; entryId: string }
	| { status: 'not_ready'; reason: string }
	| { status: 'unchanged'; entryId: string } // already finalized, no re-run requested

interface FinalizeParams {
	studentId: string
	courseId: string
	sessionId: string
	/** Manual re-run explicitly requested (e.g. admin override) — recomputes
	 *  and overwrites even if already finalized. Auto-trigger calls should
	 *  leave this false so a second TEST/EXAM release doesn't silently
	 *  clobber an already-finalized entry without someone asking for it. */
	forceRecompute?: boolean
}

/**
 * Attempts to finalize one (studentId, courseId, sessionId) triple.
 * Idempotent: calling this again with forceRecompute=false when an entry
 * is already finalized is a no-op that returns { status: 'unchanged' }.
 */
export async function finalizeTranscriptEntry(params: FinalizeParams): Promise<FinalizeOutcome> {
	const { studentId, courseId, sessionId, forceRecompute = false } = params
	const prisma = await getPrismaClient()

	const existing = await prisma.transcriptEntry.findUnique({
		where: { studentId_courseId_sessionId: { studentId, courseId, sessionId } },
	})

	if (existing?.isFinalized && !forceRecompute) {
		return { status: 'unchanged', entryId: existing.id }
	}

	// Registration check — a mark can't be finalized onto the transcript
	// for a course the student wasn't validly (APPROVED) registered for in
	// this session. Without this, a stray AssessmentResult (e.g. from a
	// misconfigured eligibility rule) could produce a transcript line for
	// a course the student never actually registered for.
	const registration = await prisma.courseRegistration.findFirst({
		where: { studentId, courseId, sessionId, status: 'APPROVED' },
	})
	if (!registration) {
		return { status: 'not_ready', reason: 'No approved course registration for this session.' }
	}

	// Pull every released TEST/EXAMINATION result for this student+course
	// within this session. Scoped through assessment.courseId and
	// assessment.course.offerings.semester.sessionId — assessments don't
	// carry sessionId directly (courses are offered per-semester via
	// CourseOffering), so we resolve session membership via the semester.
	const [testResults, examResults] = await Promise.all([
		findReleasedResults(studentId, courseId, sessionId, 'TEST'),
		findReleasedResults(studentId, courseId, sessionId, 'EXAMINATION'),
	])

	if (testResults.length === 0 && examResults.length === 0) {
		return { status: 'not_ready', reason: 'No released TEST or EXAMINATION result yet.' }
	}
	if (testResults.length === 0) {
		return { status: 'not_ready', reason: 'CA (TEST) result not yet released.' }
	}
	if (examResults.length === 0) {
		return { status: 'not_ready', reason: 'EXAMINATION result not yet released.' }
	}

	// More than one released TEST or EXAMINATION result for the same
	// course+session shouldn't normally happen (maxAttempts + one
	// assessment per type per course in your seed data), but if it does,
	// take the most recently released one rather than silently summing or
	// picking arbitrarily.
	const test = latestByReleasedAt(testResults)
	const exam = latestByReleasedAt(examResults)

	const course = await prisma.course.findUnique({
		where: { id: courseId },
		select: { creditUnits: true },
	})

	const testMark = Number(test.marksObtained)
	const examMark = Number(exam.marksObtained)
	const totalMark = testMark + examMark
	const percentage = totalMark // TranscriptEntry.totalMark is already out of 100 (30+70)

	const gradeRow = await resolveGrade(percentage)
	if (!gradeRow) {
		return {
			status: 'not_ready',
			reason: `No GradeScale band covers ${percentage}% — cannot compute grade.`,
		}
	}

	const passed = gradeRow.label !== 'F'

	const data = {
		studentId,
		courseId,
		sessionId,
		testMark,
		examMark,
		totalMark,
		percentage,
		grade: gradeRow.label,
		gradePoints: gradeRow.points,
		passed,
		creditUnits: course?.creditUnits ?? null,
		isFinalized: true,
		finalizedAt: new Date(),
	}

	const entry = existing
		? await prisma.transcriptEntry.update({ where: { id: existing.id }, data })
		: await prisma.transcriptEntry.create({ data })

	return { status: 'finalized', entryId: entry.id }
}

async function findReleasedResults(
	studentId: string,
	courseId: string,
	sessionId: string,
	type: 'TEST' | 'EXAMINATION',
) {
	const prisma = await getPrismaClient()
	return prisma.assessmentResult.findMany({
		where: {
			studentId,
			isReleased: true,
			assessment: {
				courseId,
				type,
				// An Assessment doesn't carry sessionId directly — session
				// membership is resolved through its CourseOfferings, each tied
				// to a Semester, each tied to an AcademicSession. `some` here
				// means "this assessment has at least one offering in the
				// target session" — sufficient since an assessment is normally
				// only offered within one semester/session at a time.
				course: {
					offerings: { some: { semester: { sessionId } } },
				},
			},
		},
		orderBy: { releasedAt: 'desc' },
	})
}

function latestByReleasedAt<T extends { releasedAt: Date | null }>(results: T[]): T {
	return [...results].sort((a, b) => {
		const at = a.releasedAt?.getTime() ?? 0
		const bt = b.releasedAt?.getTime() ?? 0
		return bt - at
	})[0]
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