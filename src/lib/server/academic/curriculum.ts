// src/lib/server/academic/curriculum.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { CurriculumType } from '@prisma/client';

export async function setCurriculum(input: {
	departmentId: string;
	levelId: number;
	semester: number;
	courseId: string;
	type: CurriculumType;
}) {
	const prisma = await getPrismaClient();

	return prisma.curriculum.upsert({
		where: {
			departmentId_levelId_semester_courseId: {
				departmentId: input.departmentId,
				levelId: input.levelId,
				semester: input.semester,
				courseId: input.courseId
			}
		},
		create: input,
		update: { type: input.type, isActive: true }
	});
}

export async function getCurriculum(departmentId: string, levelId: number, semester: number) {
	const prisma = await getPrismaClient();

	return prisma.curriculum.findMany({
		where: { departmentId, levelId, semester, isActive: true },
		include: { course: { select: { code: true, title: true, creditUnits: true } } },
		orderBy: { type: 'asc' }
	});
}

export async function removeCurriculumEntry(id: string) {
	const prisma = await getPrismaClient();

	return prisma.curriculum.update({ where: { id }, data: { isActive: false } });
}

/**
 * Bulk-attach a GST/shared course to every department passed in, for the same
 * level+semester. Used for GST101-style courses that span the whole university
 * rather than being entered department-by-department.
 */
export async function bulkAssignSharedCourse(input: {
	courseId: string;
	departmentIds: string[];
	levelId: number;
	semester: number;
	type?: CurriculumType;
}) {
	const prisma = await getPrismaClient();

	return prisma.$transaction(
		input.departmentIds.map((departmentId) =>
			prisma.curriculum.upsert({
				where: {
					departmentId_levelId_semester_courseId: {
						departmentId,
						levelId: input.levelId,
						semester: input.semester,
						courseId: input.courseId
					}
				},
				create: {
					departmentId,
					levelId: input.levelId,
					semester: input.semester,
					courseId: input.courseId,
					type: input.type ?? CurriculumType.gst
				},
				update: { isActive: true }
			})
		)
	);
}