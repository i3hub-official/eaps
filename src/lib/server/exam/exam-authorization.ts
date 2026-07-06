// src/lib/server/exam/exam-authorization.ts

import { canSubmitQuestions } from '$lib/server/academic/exam-authority-gate.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import type { User } from '$lib/types/user.js';

export async function checkExamCreationAuthority(input: {
  user: User;
  courseId: string;
  collegeId?: number;
  departmentId?: string;
}) {
  const { user, courseId, collegeId, departmentId } = input;
  const prisma = await getPrismaClient();

  // Get the active offering for this course
  const offering = await prisma.courseOffering.findFirst({
    where: { courseId, status: 'open' },
    select: {
      id: true,
      departments: {
        select: {
          department: {
            select: { collegeId: true, id: true }
          }
        },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!offering || !offering.departments[0]) {
    // No active offering, allow by default
    return { allowed: true, scope: 'lecturer', activeHolderName: null };
  }

  const finalCollegeId = collegeId || offering.departments[0].department.collegeId;
  const finalDepartmentId = departmentId || offering.departments[0].department.id;

  return canSubmitQuestions({
    offeringId: offering.id,
    userId: user.id,
    userRole: user.role,
    collegeId: finalCollegeId,
    departmentId: finalDepartmentId
  });
}