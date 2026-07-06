// src/routes/exam-officer/authority/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireExamOfficer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { getActiveExamAuthority, setExamAuthority } from '$lib/server/academic/exam-authority.js';
import { fail } from '@sveltejs/kit';
import { ExamAuthorityScope } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireExamOfficer(locals.user);
	if (!user.collegeId) throw new Error('Exam officer must be associated with a college');
	
	const prisma = await getPrismaClient();
	const collegeId = user.collegeId;

	// Get all open offerings in the college
	const offerings = await prisma.courseOffering.findMany({
		where: {
			status: 'open',
			departments: { some: { department: { collegeId } } }
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
	const authorities = await Promise.all(
		offerings.map((o) => getActiveExamAuthority(o.id, collegeId))
	);

	// Get all lecturers in the college (for assignment)
	const lecturers = await prisma.user.findMany({
		where: {
			role: 'lecturer',
			collegeId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			departmentId: true
		}
	});

	// Get department coordinators
	const departmentCoordinators = await prisma.user.findMany({
		where: {
			role: 'department_coordinator',
			collegeId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			departmentId: true
		}
	});

	// Get HODs
	const hodUsers = await prisma.user.findMany({
		where: {
			role: 'hod',
			collegeId,
			isActive: true
		},
		select: {
			id: true,
			fullName: true,
			email: true,
			departmentId: true
		}
	});

	// Build department lecturer map
	const departmentLecturers: Record<string, Array<{ id: string; fullName: string; email: string }>> = {};
	for (const lecturer of lecturers) {
		if (lecturer.departmentId) {
			if (!departmentLecturers[lecturer.departmentId]) {
				departmentLecturers[lecturer.departmentId] = [];
			}
			departmentLecturers[lecturer.departmentId].push({
				id: lecturer.id,
				fullName: lecturer.fullName,
				email: lecturer.email
			});
		}
	}

	return {
		offerings: offerings.map((o, i) => ({
			...o,
			authority: authorities[i]
		})),
		lecturers,
		departmentCoordinators,
		hodUsers,
		departmentLecturers
	};
};

export const actions: Actions = {
	assignAuthority: async ({ request, locals }) => {
		const user = requireExamOfficer(locals.user);
		if (!user.collegeId) throw new Error('Exam officer must be associated with a college');

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
				collegeId: user.collegeId,
				scope,
				setByDeanId: user.id, // Note: This is the Exam Officer, not a Dean
				reason,
				assignedUserId
			});
			return { success: true, message: 'Exam authority assigned successfully' };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	}
};