// src/lib/server/academic/registration.ts
import { getPrismaClient } from '$lib/server/db/index.js';
import { RegistrationStatus, RegistrationType } from '@prisma/client';
import { resolveEligibleOfferings } from './eligibility.js';

export async function registerForOffering(studentId: string, offeringId: string) {
	const prisma = await getPrismaClient();

	const offering = await prisma.courseOffering.findUniqueOrThrow({
		where: { id: offeringId },
		select: { courseId: true, academicSemesterId: true, levelId: true }
	});
	const semester = await prisma.academicSemester.findUniqueOrThrow({
		where: { id: offering.academicSemesterId }
	});

	// re-verify against the resolved eligible set — prevents registering into an
	// offering outside the student's curriculum via a crafted offeringId
	const eligible = await resolveEligibleOfferings(studentId, offering.academicSemesterId);
	if (!eligible.some((e) => e.offeringId === offeringId)) {
		throw new Error('Student is not eligible for this course offering');
	}

	return prisma.courseRegistration.upsert({
		where: {
			studentId_courseId_session_semester: {
				studentId,
				courseId: offering.courseId,
				session: semester.session,
				semester: semester.semester
			}
		},
		create: {
			studentId,
			courseId: offering.courseId,
			offeringId,
			session: semester.session,
			semester: semester.semester,
			levelId: offering.levelId,
			registrationType: RegistrationType.normal,
			status: RegistrationStatus.approved
		},
		update: { offeringId, status: RegistrationStatus.approved }
	});
}

export async function withdrawRegistration(registrationId: string) {
	const prisma = await getPrismaClient();

	return prisma.courseRegistration.update({
		where: { id: registrationId },
		data: { status: RegistrationStatus.withdrawn }
	});
}

export async function listRegistrationsForStudent(studentId: string, academicSemesterId?: number) {
	const prisma = await getPrismaClient();

	return prisma.courseRegistration.findMany({
		where: {
			studentId,
			status: { not: RegistrationStatus.withdrawn },
			...(academicSemesterId ? { offering: { academicSemesterId } } : {})
		},
		include: {
			course: { select: { code: true, title: true, creditUnits: true } },
			offering: { select: { id: true, status: true } }
		}
	});
}