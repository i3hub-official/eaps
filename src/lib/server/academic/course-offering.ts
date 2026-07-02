// src/lib/server/academic/course-offering.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { CourseOfferingStatus } from '@prisma/client';

export async function createOffering(input: {
	courseId: string;
	academicSemesterId: number;
	levelId: number;
	departmentIds: string[]; // first entry = primary/owning department
	capacity?: number;
}) {
	const prisma = await getPrismaClient();

	return prisma.$transaction(async (tx) => {
		const offering = await tx.courseOffering.create({
			data: {
				courseId: input.courseId,
				academicSemesterId: input.academicSemesterId,
				levelId: input.levelId,
				capacity: input.capacity,
				status: CourseOfferingStatus.draft
			}
		});

		await tx.courseOfferingDepartment.createMany({
			data: input.departmentIds.map((departmentId, i) => ({
				offeringId: offering.id,
				departmentId,
				isPrimary: i === 0
			}))
		});

		return offering;
	});
}

export async function attachDepartment(offeringId: string, departmentId: string, isPrimary = false) {
	const prisma = await getPrismaClient();

	return prisma.courseOfferingDepartment.upsert({
		where: { offeringId_departmentId: { offeringId, departmentId } },
		create: { offeringId, departmentId, isPrimary },
		update: { isPrimary }
	});
}

export async function detachDepartment(offeringId: string, departmentId: string) {
	const prisma = await getPrismaClient();

	return prisma.courseOfferingDepartment.delete({
		where: { offeringId_departmentId: { offeringId, departmentId } }
	});
}

export async function publishOffering(offeringId: string) {
	const prisma = await getPrismaClient();

	return prisma.courseOffering.update({
		where: { id: offeringId },
		data: { status: CourseOfferingStatus.open }
	});
}

export async function closeOffering(offeringId: string) {
	const prisma = await getPrismaClient();

	return prisma.courseOffering.update({
		where: { id: offeringId },
		data: { status: CourseOfferingStatus.closed }
	});
}

export async function getOfferingById(offeringId: string) {
	const prisma = await getPrismaClient();

	return prisma.courseOffering.findUnique({
		where: { id: offeringId },
		include: {
			course: true,
			departments: { include: { department: true } },
			teachingAssignments: { include: { lecturer: { select: { id: true, fullName: true } } } },
			academicSemester: true,
			level: true,
			_count: { select: { registrations: true } }
		}
	});
}

export async function listOfferingsForLecturer(lecturerId: string, academicSemesterId?: number) {
	const prisma = await getPrismaClient();

	return prisma.courseOffering.findMany({
		where: {
			teachingAssignments: { some: { lecturerId } },
			...(academicSemesterId ? { academicSemesterId } : {})
		},
		include: {
			course: { select: { code: true, title: true, creditUnits: true } },
			departments: { include: { department: { select: { name: true, code: true } } } },
			_count: { select: { registrations: true } }
		},
		orderBy: { createdAt: 'desc' }
	});
}

// Scoped listing for Admin/Dean/HOD/Exam Officer authz-bound views
export async function listOfferingsForScope(params: {
	collegeId?: number;
	departmentId?: string;
	academicSemesterId?: number;
}) {
	const prisma = await getPrismaClient();

	return prisma.courseOffering.findMany({
		where: {
			...(params.academicSemesterId ? { academicSemesterId: params.academicSemesterId } : {}),
			...(params.departmentId ? { departments: { some: { departmentId: params.departmentId } } } : {}),
			...(params.collegeId
				? { departments: { some: { department: { collegeId: params.collegeId } } } }
				: {})
		},
		include: {
			course: { select: { code: true, title: true } },
			departments: { include: { department: { select: { name: true } } } },
			teachingAssignments: { include: { lecturer: { select: { fullName: true } } } }
		}
	});
}