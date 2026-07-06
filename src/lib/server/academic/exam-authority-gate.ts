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
	const prisma = await getPrismaClient();
	
	// Get the active authority assignment for this offering
	const authority = await getActiveExamAuthority(input.offeringId, input.collegeId);
	
	// If no authority is assigned, default to allowing lecturer-based checks
	if (!authority) {
		// Default to lecturer scope if no authority assigned
		const teachingAssignment = await prisma.teachingAssignment.findFirst({
			where: { 
				offeringId: input.offeringId, 
				lecturerId: input.userId 
			}
		});
		
		if (teachingAssignment) {
			return { 
				allowed: true, 
				scope: ExamAuthorityScope.lecturer, 
				activeHolderName: null 
			};
		}
		
		return { 
			allowed: false, 
			scope: ExamAuthorityScope.lecturer, 
			activeHolderName: null,
			reason: 'No exam authority has been assigned by the dean'
		};
	}

	const scope = authority.scope;

	// 🔍 DEBUG: Log the authority and user info
	console.log('Authority check:', {
		authorityId: authority.id,
		scope: authority.scope,
		assignedUserId: authority.assignedUserId,
		currentUserId: input.userId,
		currentUserRole: input.userRole,
		offeringId: input.offeringId,
		collegeId: input.collegeId,
		departmentId: input.departmentId
	});

	// Get the user's full details
	const user = await prisma.user.findUnique({
		where: { id: input.userId },
		select: {
			id: true,
			fullName: true,
			role: true,
			collegeId: true,
			departmentId: true
		}
	});

	if (!user) {
		return { 
			allowed: false, 
			scope, 
			activeHolderName: null,
			reason: 'User not found'
		};
	}

	// 1️⃣ Check if the user is the explicitly assigned authority
	if (authority.assignedUserId === input.userId) {
		// User is explicitly assigned - they can create exams
		const assignedUser = await prisma.user.findUnique({
			where: { id: authority.assignedUserId! },
			select: { fullName: true, role: true }
		});
		
		const roleDisplay = assignedUser?.role 
			? ` (${formatRole(assignedUser.role)})` 
			: '';
		
		return { 
			allowed: true, 
			scope, 
			activeHolderName: assignedUser?.fullName 
				? `${assignedUser.fullName}${roleDisplay}` 
				: 'Assigned Authority'
		};
	}

	// 2️⃣ If not explicitly assigned, check based on scope
	if (scope === ExamAuthorityScope.lecturer) {
		// Check if user is a lecturer teaching this course
		const teachingAssignment = await prisma.teachingAssignment.findFirst({
			where: { 
				offeringId: input.offeringId, 
				lecturerId: input.userId 
			}
		});
		
		if (teachingAssignment) {
			return { 
				allowed: true, 
				scope, 
				activeHolderName: user.fullName || 'Assigned Lecturer'
			};
		}
	}

	if (scope === ExamAuthorityScope.department_coordinator) {
		// Check if user is a department coordinator or HOD for this department
		const deptId = input.departmentId || user.departmentId;
		
		if (deptId) {
			const isDepartmentAuthority = await prisma.user.findFirst({
				where: {
					id: input.userId,
					departmentId: deptId,
					role: { in: ['department_coordinator', 'hod'] }
				}
			});
			
			if (isDepartmentAuthority) {
				return { 
					allowed: true, 
					scope, 
					activeHolderName: user.fullName || 'Department Coordinator'
				};
			}
		}
	}

	if (scope === ExamAuthorityScope.college_coordinator) {
		// Check if user is an exam officer or college coordinator for this college
		const isCollegeAuthority = await prisma.user.findFirst({
			where: {
				id: input.userId,
				collegeId: input.collegeId,
				role: { in: ['exam_officer', 'college_coordinator'] }
			}
		});
		
		if (isCollegeAuthority) {
			return { 
				allowed: true, 
				scope, 
				activeHolderName: user.fullName || 'College Coordinator'
			};
		}
	}

	// 3️⃣ User is not authorized - get the actual authority holder's name
	let holderName: string | null = null;
	if (authority.assignedUserId) {
		const holder = await prisma.user.findUnique({
			where: { id: authority.assignedUserId },
			select: { fullName: true, role: true }
		});
		if (holder) {
			holderName = `${holder.fullName} (${formatRole(holder.role)})`;
		}
	}

	// If no assigned user, use scope description
	if (!holderName) {
		const scopeDescriptions = {
			[ExamAuthorityScope.lecturer]: 'the assigned lecturer',
			[ExamAuthorityScope.department_coordinator]: 'the department coordinator/HOD',
			[ExamAuthorityScope.college_coordinator]: 'the college exam officer'
		};
		holderName = scopeDescriptions[scope] || 'someone';
	}

	return { 
		allowed: false, 
		scope, 
		activeHolderName: holderName,
		reason: `You are not the assigned authority for this course. The authority is ${holderName}.`
	};
}

// Helper function to format role names
function formatRole(role: string): string {
	const roleMap: Record<string, string> = {
		'lecturer': 'Lecturer',
		'department_coordinator': 'Dept Coordinator',
		'exam_officer': 'Exam Officer',
		'college_coordinator': 'College Coordinator',
		'hod': 'HOD',
		'dean': 'Dean',
		'admin': 'Admin'
	};
	return roleMap[role] || role.replace(/_/g, ' ');
}

// Also update setExamAuthority to properly set assignedUserId
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

	// Verify the assigned user exists and has the appropriate role
	const user = await prisma.user.findUnique({
		where: { id: assignedUserId },
		select: { 
			id: true, 
			role: true, 
			collegeId: true,
			departmentId: true,
			fullName: true
		}
	});

	if (!user) {
		throw new Error(`User with ID ${assignedUserId} not found`);
	}

	// Validate based on scope
	if (scope === ExamAuthorityScope.college_coordinator) {
		if (user.role !== 'exam_officer' && user.role !== 'college_coordinator') {
			throw new Error('assignedUserId must be an exam_officer or college_coordinator');
		}
		if (user.collegeId !== collegeId) {
			throw new Error(`Assigned user must belong to college ${collegeId}`);
		}
	} else if (scope === ExamAuthorityScope.department_coordinator) {
		if (user.role !== 'department_coordinator' && user.role !== 'hod') {
			throw new Error('assignedUserId must be a department_coordinator or HOD');
		}
		if (!user.departmentId) {
			throw new Error('Assigned user must belong to a department');
		}
	} else if (scope === ExamAuthorityScope.lecturer) {
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

	// Lock check
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
				assignedUserId, // ALWAYS set this
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