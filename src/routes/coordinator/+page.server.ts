// src/routes/coordinator/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDepartmentCoordinatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
	
	if (user.role !== 'department_coordinator') {
		throw error(403, 'Access denied. Department Coordinator access required.');
	}
	
	if (!user.departmentId) {
		throw error(400, 'Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();
	const departmentId = user.departmentId;

	// Get department info
	const department = await prisma.department.findUnique({
		where: { id: departmentId },
		select: {
			id: true,
			name: true,
			code: true,
			college: { select: { name: true } }
		}
	});

	// Get ALL lecturers in the department (not just 5)
	const lecturers = await prisma.user.findMany({
		where: {
			role: 'lecturer',
			departmentId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			staffId: true,
			teachingAssignments: {
				select: { id: true }
			},
			lecturerCourses: {
				select: { id: true }
			}
		},
		orderBy: { fullName: 'asc' }
	});

	// Get recent exams (limit to 5)
	const recentExams = await prisma.exam.findMany({
		where: {
			examDepartments: { some: { departmentId } }
		},
		orderBy: { createdAt: 'desc' },
		take: 5,
		select: {
			id: true,
			title: true,
			status: true,
			scheduledStart: true,
			scheduledEnd: true,
			course: { select: { code: true, title: true } },
			examSessions: {
				select: { id: true },
				where: { status: { not: 'not_started' } }
			}
		}
	});

	// Get stats
	const [totalExams, activeExams, totalLecturers, totalCourses] = await Promise.all([
		prisma.exam.count({
			where: { examDepartments: { some: { departmentId } } }
		}),
		prisma.exam.count({
			where: {
				examDepartments: { some: { departmentId } },
				status: 'active'
			}
		}),
		prisma.user.count({
			where: {
				role: 'lecturer',
				departmentId,
				isActive: true
			}
		}),
		prisma.course.count({
			where: { departmentId, isActive: true }
		})
	]);

	// Get pending exam authority assignments
	const pendingAuthority = await prisma.examAuthorityAssignment.count({
		where: {
			college: {
				departments: { some: { id: departmentId } }
			},
			isActive: false,
			assignedUserId: null
		}
	});

	return {
		user,
		department,
		stats: {
			totalExams,
			activeExams,
			totalLecturers,
			totalCourses,
			pendingAuthority
		},
		recentExams,
		recentLecturers: lecturers
	};
};