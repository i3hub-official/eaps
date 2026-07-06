// src/routes/coordinator/exams/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDepartmentCoordinatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
	if (user.role !== 'department_coordinator') {
		throw new Error('Access denied. Department Coordinator access required.');
	}
	
	if (!user.departmentId) {
		throw new Error('Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();
	const departmentId = user.departmentId;

	// Get all exams in the department
	const exams = await prisma.exam.findMany({
		where: {
			examDepartments: { some: { departmentId } }
		},
		select: {
			id: true,
			title: true,
			status: true,
			totalMarks: true,
			durationMinutes: true,
			scheduledStart: true,
			scheduledEnd: true,
			createdAt: true,
			course: { select: { code: true, title: true } },
			lecturer: { select: { id: true, fullName: true } },
			examSessions: {
				select: { id: true, status: true },
				where: { status: { not: 'not_started' } }
			},
			examResults: {
				select: { id: true, score: true }
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	// Get stats
	const stats = {
		total: exams.length,
		draft: exams.filter(e => e.status === 'draft').length,
		scheduled: exams.filter(e => e.status === 'scheduled').length,
		active: exams.filter(e => e.status === 'active').length,
		completed: exams.filter(e => e.status === 'completed').length,
		cancelled: exams.filter(e => e.status === 'cancelled').length,
		totalSessions: exams.reduce((sum, e) => sum + e.examSessions.length, 0),
		completedSessions: exams.reduce((sum, e) => sum + e.examSessions.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length, 0)
	};

	// Get status counts for chart
	const statusCounts = {
		draft: stats.draft,
		scheduled: stats.scheduled,
		active: stats.active,
		completed: stats.completed,
		cancelled: stats.cancelled
	};

	return {
		exams,
		stats,
		statusCounts,
		departmentId
	};
};