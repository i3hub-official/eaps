// src/routes/dean/exam-authority/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { setExamAuthority, getActiveExamAuthority } from '$lib/server/academic/exam-authority.js';
import { fail } from '@sveltejs/kit';
import { ExamAuthorityScope } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireDean(locals.user);
	const prisma = await getPrismaClient();
	const collegeId = locals.user!.collegeId!;

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

	const authorities = await Promise.all(
		offerings.map((o) => getActiveExamAuthority(o.id, collegeId))
	);

	// Fetch Exam Officers (Dean delegates exam authority to them)
	const examOfficers = await prisma.user.findMany({
		where: { 
			role: 'exam_officer', 
			collegeId, 
			isActive: true 
		},
		select: { 
			id: true, 
			fullName: true, 
			email: true 
		}
	});

	// Fetch Department Coordinators (Dean delegates course coordination to them)
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

	return {
		offerings: offerings.map((o, i) => ({ 
			...o, 
			authority: authorities[i],
		})),
		examOfficers,
		departmentCoordinators
	};
};

export const actions: Actions = {
	setAuthority: async ({ request, locals }) => {
		requireDean(locals.user);
		const collegeId = locals.user!.collegeId!;
		const form = await request.formData();

		const offeringId = form.get('offeringId') as string;
		const scope = form.get('scope') as ExamAuthorityScope;
		const assignedUserId = (form.get('assignedUserId') as string) || undefined;
		const reason = (form.get('reason') as string) || undefined;

		if (!assignedUserId) {
			return fail(400, { 
				error: 'Please select an Exam Officer or Department Coordinator to assign authority.' 
			});
		}

		if (!offeringId) {
			return fail(400, { error: 'Course offering ID is required' });
		}

		if (!scope) {
			return fail(400, { error: 'Please select an authority scope' });
		}

		try {
			await setExamAuthority({
				offeringId,
				collegeId,
				scope,
				setByDeanId: locals.user!.id,
				reason,
				assignedUserId
			});
			return { success: true };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	},

	setAuthorityBulk: async ({ request, locals }) => {
		requireDean(locals.user);
		const collegeId = locals.user!.collegeId!;
		const form = await request.formData();

		const offeringIdsRaw = form.get('offeringIds') as string;
		const offeringIds = offeringIdsRaw.split(',').filter(Boolean);
		const scope = form.get('scope') as ExamAuthorityScope;
		const assignedUserId = (form.get('assignedUserId') as string) || undefined;
		const reason = (form.get('reason') as string) || undefined;

		if (!assignedUserId) {
			return fail(400, { 
				error: 'Please select an Exam Officer or Department Coordinator to assign authority.' 
			});
		}

		if (offeringIds.length === 0) {
			return fail(400, { error: 'No courses selected for bulk action' });
		}

		if (!scope) {
			return fail(400, { error: 'Please select an authority scope' });
		}

		const results = { success: 0, failed: 0, errors: [] as string[] };

		for (const offeringId of offeringIds) {
			try {
				await setExamAuthority({
					offeringId,
					collegeId,
					scope,
					setByDeanId: locals.user!.id,
					reason,
					assignedUserId
				});
				results.success++;
			} catch (err) {
				results.failed++;
				results.errors.push((err as Error).message);
			}
		}

		if (results.failed > 0) {
			return fail(400, {
				error: `Applied to ${results.success} courses. ${results.failed} failed: ${results.errors.slice(0, 3).join(', ')}`,
				success: results.success > 0,
				details: results.errors
			});
		}

		return { success: true, count: results.success };
	}
};