// src/lib/server/auth/roleHome.ts
import type { StaffRole } from '@prisma/client';

/**
 * One-to-one mapping: every StaffRole gets its own distinct home route.
 * No role shares a dashboard with another — an Exam Officer's job is not
 * an HOD's job, a College Coordinator's job is not a Dean's job, etc.
 */
const ROLE_HOME: Record<StaffRole, string> = {
  SUPER_ADMIN: '/admin',
  VC: '/vc',
  DVC: '/dvc',
  REGISTRAR: '/registrar',
  UNIVERSITY_EXAM_OFFICER: '/university-exam-officer',
  UNIVERSITY_COURSE_COORDINATOR: '/university-course-coordinator',
  DEAN: '/dean',
  HOD: '/hod',
  COLLEGE_EXAM_OFFICER: '/college-exam-officer',
  COLLEGE_COORDINATOR: '/college-coordinator',
  DEPARTMENT_EXAM_OFFICER: '/department-exam-officer',
  DEPARTMENT_COORDINATOR: '/department-coordinator',
  LECTURER: '/lecturer',
  INVIGILATOR: '/invigilator',
};

export function staffRoleHome(role: StaffRole): string {
  return ROLE_HOME[role] ?? '/';
}