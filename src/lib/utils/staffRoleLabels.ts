// src/lib/utils/staffRoleLabels.ts
//
// primaryRole is a routing-level enum (matches memory: "role-based access
// uses primaryRole for routing and active StaffRoleAssignment rows for
// capability checks") — it has no displayName of its own, unlike the RBAC
// Role model which does. This covers every StaffRole enum value for the
// profile page's "primary role" badge; the *capability* role badges below
// it come straight from Role.displayName instead.

import type { StaffRole } from '@prisma/client';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
	SUPER_ADMIN: 'Super Admin',
	VC: 'Vice Chancellor',
	DVC: 'Deputy Vice Chancellor',
	REGISTRAR: 'Registrar',
	UNIVERSITY_EXAM_OFFICER: 'University Exam Officer',
	UNIVERSITY_COURSE_COORDINATOR: 'University Course Coordinator',
	DEAN: 'Dean',
	HOD: 'Head of Department',
	COLLEGE_EXAM_OFFICER: 'College Exam Officer',
	COLLEGE_COORDINATOR: 'College Coordinator',
	DEPARTMENT_EXAM_OFFICER: 'Department Exam Officer',
	DEPARTMENT_COORDINATOR: 'Department Coordinator',
	LECTURER: 'Lecturer',
	INVIGILATOR: 'Invigilator',
};