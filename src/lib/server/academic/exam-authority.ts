// src/lib/server/academic/exam-authority.ts

import { getPrismaClient } from '$lib/server/db/index.js';
import { ExamAuthorityScope } from '@prisma/client';

export async function setExamAuthority(input: {
	offeringId: string;
	collegeId: number;
	scope: ExamAuthorityScope;
	setByDeanId: string;
	reason?: string;
	assignedUserId?: string; // required only when scope = college_coordinator
}) {
	const prisma = await getPrismaClient();
	const { offeringId, collegeId, scope, setByDeanId, reason, assignedUserId } = input;

	if (scope === ExamAuthorityScope.college_coordinator) {
		if (!assignedUserId) {
			throw new Error('assignedUserId is required for college_coordinator mode');
		}
		const coordinator = await prisma.user.findFirst({
			where: { id: assignedUserId, role: 'exam_officer', collegeId }
		});
		if (!coordinator) {
			throw new Error('assignedUserId must be an exam_officer belonging to this college');
		}
	}

	// ── Lock check: once any student has started (or finished) an exam tied
	// to this offering, the authority behind it is frozen. No reassignment,
	// no exceptions — this runs before the college_coordinator validation's
	// result is used, so a locked offering can't be changed even by a Dean
	// who supplies a valid assignedUserId.
	const inProgressSession = await prisma.examSession.findFirst({
		where: {
			exam: { offeringId },
			status: { not: 'not_started' }
		},
		select: { id: true, status: true }
	});

	if (inProgressSession) {
		throw new Error(
			'Cannot change exam authority: one or more students have already started this exam. ' +
			'Authority is locked once a session begins.'
		);
	}

	return prisma.$transaction(async (tx) => {
		await tx.examAuthorityAssignment.updateMany({
			where: { offeringId, collegeId, isActive: true },
			data: { isActive: false, supersededAt: new Date() }
		});

		const created = await tx.examAuthorityAssignment.create({
			data: {
				offeringId,
				collegeId,
				scope,
				assignedUserId: scope === ExamAuthorityScope.college_coordinator ? assignedUserId : null,
				reason,
				setByDeanId
			}
		});

		await tx.auditLog.create({
			data: {
				userId: setByDeanId,
				action: 'exam_authority_changed',
				entity: 'ExamAuthorityAssignment',
				entityId: created.id,
				metadata: { offeringId, collegeId, scope, reason }
			}
		});

		return created;
	});
}

export async function getActiveExamAuthority(offeringId: string, collegeId: number) {
	const prisma = await getPrismaClient();

	return prisma.examAuthorityAssignment.findFirst({
		where: { offeringId, collegeId, isActive: true }
	});
}

export async function listExamAuthorityHistory(offeringId: string, collegeId: number) {
	const prisma = await getPrismaClient();

	return prisma.examAuthorityAssignment.findMany({
		where: { offeringId, collegeId },
		include: { setByDean: { select: { fullName: true } }, assignedUser: { select: { fullName: true } } },
		orderBy: { createdAt: 'desc' }
	});
}

export async function getCollegeExamOfficers(collegeId: number) {
	const prisma = await getPrismaClient();

	return prisma.user.findMany({
		where: {
			role: 'exam_officer',
			collegeId: collegeId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			staffId: true
		}
	});
}