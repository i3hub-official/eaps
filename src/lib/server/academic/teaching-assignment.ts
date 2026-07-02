// src/lib/server/academic/teaching-assignment.ts
import { getPrismaClient } from '$lib/server/db/index.js';

export async function assignLecturer(
	offeringId: string,
	lecturerId: string,
	assignedById?: string,
	isPrimary = true
) {
	const prisma = await getPrismaClient();

	return prisma.teachingAssignment.upsert({
		where: { offeringId_lecturerId: { offeringId, lecturerId } },
		create: { offeringId, lecturerId, assignedById, isPrimary },
		update: { isPrimary }
	});
}

export async function unassignLecturer(offeringId: string, lecturerId: string) {
	const prisma = await getPrismaClient();

	return prisma.teachingAssignment.delete({
		where: { offeringId_lecturerId: { offeringId, lecturerId } }
	});
}

export async function isLecturerOnOffering(offeringId: string, lecturerId: string) {
	const prisma = await getPrismaClient();

	const assignment = await prisma.teachingAssignment.findUnique({
		where: { offeringId_lecturerId: { offeringId, lecturerId } }
	});
	return !!assignment;
}

export async function listLecturerOfferingIds(lecturerId: string): Promise<string[]> {
	const prisma = await getPrismaClient();

	const rows = await prisma.teachingAssignment.findMany({
		where: { lecturerId },
		select: { offeringId: true }
	});
	return rows.map((r) => r.offeringId);
}