import type { PageServerLoad } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	await requireDean(locals.user);
	const prisma = await getPrismaClient();
	const collegeId = locals.user!.collegeId!;

	const examOfficers = await prisma.user.findMany({
		where: { role: 'exam_officer', collegeId },
		select: {
			id: true,
			fullName: true,
			email: true,
			phone: true,
			staffId: true,
			photoUrl: true,
			isActive: true,
			isSuspended: true
		},
		orderBy: { fullName: 'asc' }
	});

	// "College coordinators" = users the dean has actually assigned the
	// college_coordinator scope to on at least one active offering — this is
	// a scope on ExamAuthorityAssignment, not a fixed User.role, so we derive
	// the distinct set of people from active assignments in this college.
	const activeCollegeCoordinatorAssignments = await prisma.examAuthorityAssignment.findMany({
		where: {
			collegeId,
			scope: 'college_coordinator',
			isActive: true,
			assignedUserId: { not: null }
		},
		select: { assignedUserId: true },
		distinct: ['assignedUserId']
	});

	const coordinatorIds = activeCollegeCoordinatorAssignments
		.map((a) => a.assignedUserId)
		.filter((id): id is string => !!id);

	const collegeCoordinators =
		coordinatorIds.length > 0
			? await prisma.user.findMany({
					where: { id: { in: coordinatorIds } },
					select: {
						id: true,
						fullName: true,
						email: true,
						phone: true,
						staffId: true,
						photoUrl: true,
						isActive: true,
						isSuspended: true
					},
					orderBy: { fullName: 'asc' }
				})
			: [];

	return {
		examOfficers,
		collegeCoordinators
	};
};