// src/routes/coordinator/authority/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDepartmentCoordinatorOrAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getActiveExamAuthority, setExamAuthority } from '$lib/server/academic/exam-authority.js';
import { fail } from '@sveltejs/kit';
import { ExamAuthorityScope } from '@prisma/client';

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

	// Get all open offerings in the department
	const offerings = await prisma.courseOffering.findMany({
		where: {
			status: 'open',
			departments: { some: { departmentId } }
		},
		select: {
			id: true,
			course: { select: { code: true, title: true } },
			academicSemester: { select: { label: true, session: true, semester: true } },
			departments: {
				select: {
					department: {
						select: { id: true, name: true }
					}
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	// Get current authorities for each offering
	const department = await prisma.department.findUnique({
		where: { id: departmentId },
		select: { collegeId: true }
	});

	if (!department) throw new Error('Department not found');

	const authorities = await Promise.all(
		offerings.map((o) => getActiveExamAuthority(o.id, department.collegeId))
	);

	// Get all lecturers in the department
	const lecturers = await prisma.user.findMany({
		where: {
			role: 'lecturer',
			departmentId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true
		}
	});

	// Get department coordinators
	const departmentCoordinators = await prisma.user.findMany({
		where: {
			role: 'department_coordinator',
			departmentId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true
		}
	});

	return {
		offerings: offerings.map((o, i) => ({
			...o,
			authority: authorities[i]
		})),
		lecturers,
		departmentCoordinators,
		collegeId: department.collegeId,
		departmentId,
		coordinatorId: user.id
	};
};

export const actions: Actions = {
	assignAuthority: async ({ request, locals }) => {
		const user = await requireDepartmentCoordinatorOrAdmin(locals.user);
		if (user.role !== 'department_coordinator') {
			return fail(403, { error: 'Access denied. Department Coordinator access required.' });
		}
		
		if (!user.departmentId) {
			return fail(400, { error: 'Department Coordinator must be associated with a department' });
		}

		const prisma = await getPrismaClient();
		const department = await prisma.department.findUnique({
			where: { id: user.departmentId },
			select: { collegeId: true }
		});

		if (!department) {
			return fail(400, { error: 'Department not found' });
		}

		const form = await request.formData();
		const offeringId = form.get('offeringId') as string;
		const scope = form.get('scope') as ExamAuthorityScope;
		const assignedUserId = form.get('assignedUserId') as string;
		const reason = (form.get('reason') as string) || undefined;

		if (!offeringId) {
			return fail(400, { error: 'Course offering is required' });
		}

		if (!scope) {
			return fail(400, { error: 'Please select who should create exams' });
		}

		if (!assignedUserId) {
			return fail(400, { error: 'Please select a person to assign' });
		}

		try {
			await setExamAuthority({
				offeringId,
				collegeId: department.collegeId,
				scope,
				setByDeanId: user.id,
				reason,
				assignedUserId
			});
			return { success: true, message: 'Exam authority assigned successfully' };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	}
};