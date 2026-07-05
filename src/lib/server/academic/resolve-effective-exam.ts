import { getPrismaClient } from '$lib/server/db/index.js';
import { ExamAuthorityScope } from '@prisma/client';

export async function resolveEffectiveExam(offeringId: string, studentId: string) {
	const prisma = await getPrismaClient();

	const student = await prisma.user.findUniqueOrThrow({
		where: { id: studentId },
		select: { departmentId: true, department: { select: { collegeId: true } } }
	});

	if (!student.departmentId || !student.department) {
		throw new Error('Student has no department assigned; cannot resolve exam');
	}

	const collegeId = student.department.collegeId;
	const authority = await prisma.examAuthorityAssignment.findFirst({
		where: { offeringId, collegeId, isActive: true }
	});

	const scope = authority?.scope ?? ExamAuthorityScope.lecturer;

	if (scope === ExamAuthorityScope.college_coordinator) {
		if (!authority?.assignedUserId) {
			throw new Error('college_coordinator mode active but no coordinator assigned');
		}
		return prisma.exam.findFirstOrThrow({
			where: { offeringId, createdBy: authority.assignedUserId },
			orderBy: { createdAt: 'desc' }
		});
	}

	if (scope === ExamAuthorityScope.department_coordinator) {
		const hod = await prisma.user.findFirstOrThrow({
			where: { role: 'hod', departmentId: student.departmentId }
		});
		return prisma.exam.findFirstOrThrow({
			where: { offeringId, createdBy: hod.id },
			orderBy: { createdAt: 'desc' }
		});
	}

	// lecturer mode — the lecturer assigned to this student's specific department
	const assignment = await prisma.teachingAssignment.findFirstOrThrow({
		where: {
			offeringId,
			OR: [{ departmentId: student.departmentId }, { departmentId: null }]
		},
		orderBy: { isPrimary: 'desc' }
	});

	return prisma.exam.findFirstOrThrow({
		where: { offeringId, createdBy: assignment.lecturerId },
		orderBy: { createdAt: 'desc' }
	});
}