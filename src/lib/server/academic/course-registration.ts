// src/lib/server/academic/course-registration.ts

import { getPrismaClient } from '$lib/server/db/index.js';

export async function registerForOffering(studentId: string, offeringId: string, session: string, semester: number) {
  const prisma = await getPrismaClient();

  const student = await prisma.user.findUniqueOrThrow({
    where: { id: studentId },
    select: { departmentId: true },
  });

  const offering = await prisma.courseOffering.findUniqueOrThrow({
    where: { id: offeringId },
    select: {
      courseId: true, levelId: true,
      departments: { select: { departmentId: true } },
    },
  });

  const isOwnDepartment = offering.departments.some(d => d.departmentId === student.departmentId);

  return prisma.courseRegistration.create({
    data: {
      studentId,
      courseId: offering.courseId,
      offeringId,
      session,
      semester,
      levelId: offering.levelId,
      registrationType: isOwnDepartment ? 'normal' : 'borrowed',
      status: 'approved', // auto-approved — no manual gate for self-service BYOD registration
    },
  });
}