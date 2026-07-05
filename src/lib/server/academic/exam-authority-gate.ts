// src/lib/server/academic/exam-authority-gate.ts
import { getActiveExamAuthority } from './exam-authority.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { ExamAuthorityScope } from '@prisma/client';
import type { ExamAuthorityGate } from '$lib/types/exam.js';

export async function canSubmitQuestions(input: {
	offeringId: string;
	userId: string;
	userRole: string;
	collegeId: number;
	departmentId?: string;
}): Promise<ExamAuthorityGate> {
	const authority = await getActiveExamAuthority(input.offeringId, input.collegeId);
	const scope = authority?.scope ?? ExamAuthorityScope.lecturer;

	if (scope === ExamAuthorityScope.lecturer) {
		if (input.userRole !== 'lecturer') {
			return { allowed: false, scope, activeHolderName: null };
		}
		const prisma = await getPrismaClient();
		const isAssigned = await prisma.teachingAssignment.findFirst({
			where: { offeringId: input.offeringId, lecturerId: input.userId }
		});
		return { allowed: !!isAssigned, scope, activeHolderName: null };
	}

	if (scope === ExamAuthorityScope.department_coordinator) {
		const prisma = await getPrismaClient();
		const hod = await prisma.user.findFirst({
			where: { role: 'hod', departmentId: input.departmentId },
			select: { id: true, fullName: true }
		});
		const allowed = input.userRole === 'hod' && input.userId === hod?.id;
		return { allowed, scope, activeHolderName: hod?.fullName ?? 'the department HOD' };
	}

	// college_coordinator
	const prisma = await getPrismaClient();
	const officer = authority?.assignedUserId
		? await prisma.user.findUnique({ where: { id: authority.assignedUserId }, select: { fullName: true } })
		: null;
	const allowed = input.userRole === 'exam_officer' && input.userId === authority?.assignedUserId;
	return { allowed, scope, activeHolderName: officer?.fullName ?? 'the college exam officer' };
}