// src/routes/coordinator/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireDepartmentCoordinatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
	
	// Check if user has department_coordinator role
	if (user.role !== 'department_coordinator') {
		throw error(403, 'Access denied. Department Coordinator access required.');
	}
	
	if (!user.departmentId) {
		throw error(400, 'Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();

	// Get department info
	const department = await prisma.department.findUnique({
		where: { id: user.departmentId },
		select: {
			id: true,
			name: true,
			code: true,
			collegeId: true,
			college: { select: { name: true, id: true } }
		}
	});

	// Get stats for the department
	const [totalExams, activeExams, pendingResults, totalLecturers, totalCourses] = await Promise.all([
		prisma.exam.count({
			where: {
				examDepartments: { some: { departmentId: user.departmentId } }
			}
		}),
		prisma.exam.count({
			where: {
				examDepartments: { some: { departmentId: user.departmentId } },
				status: 'active'
			}
		}),
		prisma.examResult.count({
			where: {
				exam: {
					examDepartments: { some: { departmentId: user.departmentId } }
				},
				score: null
			}
		}),
		prisma.user.count({
			where: {
				role: 'lecturer',
				departmentId: user.departmentId,
				isActive: true
			}
		}),
		prisma.course.count({
			where: { departmentId: user.departmentId, isActive: true }
		})
	]);

	// Get notifications
	const notifications = await prisma.notification.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: {
			id: true,
			title: true,
			message: true,
			isRead: true,
			createdAt: true
		}
	});

	const unreadCount = await prisma.notification.count({
		where: { userId: user.id, isRead: false }
	});

	// Check if this user also has lecturer role
	const secondaryRoles = await prisma.userRoleAssignment.findMany({
		where: { userId: user.id },
		select: { role: true }
	});
	const alsoLectures = secondaryRoles.some(r => r.role === 'lecturer');

	return {
		user,
		department,
		stats: {
			totalExams,
			activeExams,
			pendingResults,
			totalLecturers,
			totalCourses
		},
		notifications,
		unreadCount,
		coordinatorId: user.id,
		departmentId: user.departmentId,
		alsoLectures
	};
};