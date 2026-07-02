// src/lib/server/academic/registration-admin.ts
//
// Admin-only overrides for the registration state machine. Every unlock is
// logged to AuditLog — this bypasses a deliberate one-time-update limit, so
// there should always be a record of who did it, for whom, and why.

import { getPrismaClient } from '$lib/server/db/index.js';
import { getRegPhase, setRegPhase, regPhaseKey, type RegPhase } from './reg-phase.js';

export interface RegistrationSnapshot {
	studentId: string;
	studentName: string;
	matricNumber: string | null;
	session: string;
	semester: number;
	phase: RegPhase;
	registeredCourses: number;
}

/**
 * Returns the current registration phase for a student in a given
 * session/semester, plus enough context for an admin to decide whether
 * unlocking is appropriate.
 */
export async function getStudentRegistrationSnapshot(
	studentId: string,
	session: string,
	semester: number
): Promise<RegistrationSnapshot> {
	const prisma = await getPrismaClient();

	const student = await prisma.user.findUniqueOrThrow({
		where: { id: studentId },
		select: { fullName: true, matricNumber: true }
	});

	const key = regPhaseKey(session, semester);
	const phase = await getRegPhase(studentId, key);

	const registeredCourses = await prisma.courseRegistration.count({
		where: { studentId, session, semester, status: { not: 'withdrawn' } }
	});

	return {
		studentId,
		studentName: student.fullName,
		matricNumber: student.matricNumber,
		session,
		semester,
		phase,
		registeredCourses
	};
}

/**
 * Resets a student's registration phase back to 'draft' for a specific
 * session/semester, regardless of the global AcademicSemester.regOpen flag —
 * this is a targeted override for one student, not a policy change.
 *
 * The student's existing registrations are untouched; they simply regain the
 * ability to add/drop courses through the normal batchRegister/submit/update
 * flow, which will re-lock them the next time they complete an update, same
 * as any other student.
 *
 * Always logged to AuditLog since this bypasses the one-time-update limit.
 */
export async function unlockStudentRegistration(params: {
	studentId: string;
	session: string;
	semester: number;
	unlockedById: string;
	reason?: string;
	targetPhase?: RegPhase; // defaults to 'draft' — full re-open
}): Promise<{ previousPhase: RegPhase; newPhase: RegPhase }> {
	const prisma = await getPrismaClient();
	const { studentId, session, semester, unlockedById, reason, targetPhase = 'draft' } = params;

	const key = regPhaseKey(session, semester);
	const previousPhase = await getRegPhase(studentId, key);

	if (previousPhase === targetPhase) {
		return { previousPhase, newPhase: targetPhase };
	}

	await setRegPhase(studentId, key, targetPhase);

	await prisma.auditLog.create({
		data: {
			userId: unlockedById,
			action: 'registration_unlock',
			entity: 'CourseRegistration',
			entityId: studentId,
			metadata: {
				studentId,
				session,
				semester,
				previousPhase,
				newPhase: targetPhase,
				reason: reason ?? null
			}
		}
	});

	return { previousPhase, newPhase: targetPhase };
}