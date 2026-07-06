// src/lib/server/academic/exam-authority.ts

import { getPrismaClient } from '$lib/server/db/index.js';
import { ExamAuthorityScope } from '@prisma/client';

export async function setExamAuthority(input: {
	offeringId: string;
	collegeId: number;
	scope: ExamAuthorityScope;
	setByDeanId: string;
	reason?: string;
	assignedUserId: string; // Now REQUIRED for ALL scopes
}) {
	const prisma = await getPrismaClient();
	const { offeringId, collegeId, scope, setByDeanId, reason, assignedUserId } = input;

	// Validate that assignedUserId is provided for ALL scopes
	if (!assignedUserId) {
		throw new Error('assignedUserId is required. Dean must assign a specific person for all authority scopes.');
	}

	// Verify the assigned user exists
	const user = await prisma.user.findUnique({
		where: { id: assignedUserId },
		select: { 
			id: true, 
			role: true, 
			collegeId: true,
			departmentId: true,
			fullName: true,
			email: true
		}
	});

	if (!user) {
		throw new Error(`User with ID ${assignedUserId} not found`);
	}

	// Validate based on scope
	if (scope === ExamAuthorityScope.college_coordinator) {
		// For college coordinator: user must be exam_officer or college_coordinator
		if (user.role !== 'exam_officer' && user.role !== 'college_coordinator') {
			throw new Error('assignedUserId must be an exam_officer or college_coordinator');
		}
		if (user.collegeId !== collegeId) {
			throw new Error(`Assigned user must belong to college ${collegeId}`);
		}
	} else if (scope === ExamAuthorityScope.department_coordinator) {
		// For department coordinator: user must be department_coordinator or hod
		if (user.role !== 'department_coordinator' && user.role !== 'hod') {
			throw new Error('assignedUserId must be a department_coordinator or HOD');
		}
		// Check if the user belongs to a department (optional, but good practice)
		if (!user.departmentId) {
			throw new Error('Assigned user must belong to a department');
		}
	} else if (scope === ExamAuthorityScope.lecturer) {
		// For lecturer: user must be a lecturer
		if (user.role !== 'lecturer') {
			throw new Error('assignedUserId must be a lecturer');
		}
		
		// Verify they are actually teaching this course offering
		const teachingAssignment = await prisma.teachingAssignment.findFirst({
			where: { 
				offeringId, 
				lecturerId: assignedUserId 
			}
		});
		
		if (!teachingAssignment) {
			throw new Error('Assigned lecturer is not teaching this course offering');
		}
	}

	// ── Lock check: once any student has started (or finished) an exam tied
	// to this offering, the authority behind it is frozen.
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
		// Deactivate any existing active authority
		await tx.examAuthorityAssignment.updateMany({
			where: { offeringId, collegeId, isActive: true },
			data: { isActive: false, supersededAt: new Date() }
		});

		// Create new authority assignment - now with assignedUserId for ALL scopes
		const created = await tx.examAuthorityAssignment.create({
			data: {
				offeringId,
				collegeId,
				scope,
				assignedUserId, // ALWAYS set this now
				reason,
				setByDeanId
			}
		});

		// Log the change
		await tx.auditLog.create({
			data: {
				userId: setByDeanId,
				action: 'exam_authority_changed',
				entity: 'ExamAuthorityAssignment',
				entityId: created.id,
				metadata: { 
					offeringId, 
					collegeId, 
					scope, 
					assignedUserId,
					assignedUserRole: user.role,
					assignedUserName: user.fullName,
					reason 
				}
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
		include: { 
			setByDean: { select: { fullName: true } }, 
			assignedUser: { select: { fullName: true, role: true, email: true } } 
		},
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

// Helper function to get assignable users for a specific scope
export async function getAssignableUsersForScope(input: {
	collegeId: number;
	scope: ExamAuthorityScope;
	offeringId?: string; // Required for lecturer scope
}) {
	const prisma = await getPrismaClient();
	const { collegeId, scope, offeringId } = input;

	if (scope === ExamAuthorityScope.college_coordinator) {
		return prisma.user.findMany({
			where: {
				role: { in: ['exam_officer', 'college_coordinator'] },
				collegeId: collegeId,
				isActive: true
			},
			select: {
				id: true,
				fullName: true,
				email: true,
				role: true
			}
		});
	}

	if (scope === ExamAuthorityScope.department_coordinator) {
		return prisma.user.findMany({
			where: {
				role: { in: ['department_coordinator', 'hod'] },
				collegeId: collegeId,
				isActive: true
			},
			select: {
				id: true,
				fullName: true,
				email: true,
				role: true,
				departmentId: true
			}
		});
	}

	if (scope === ExamAuthorityScope.lecturer) {
		if (!offeringId) {
			throw new Error('offeringId is required to get assignable lecturers');
		}
		
		// Get lecturers teaching this offering
		return prisma.teachingAssignment.findMany({
			where: { offeringId },
			include: {
				lecturer: {
					select: {
						id: true,
						fullName: true,
						email: true,
						role: true
					}
				}
			}
		}).then(assignments => 
			assignments.map(a => ({
				id: a.lecturer.id,
				fullName: a.lecturer.fullName,
				email: a.lecturer.email,
				role: a.lecturer.role
			}))
		);
	}

	return [];
}