
// src/routes/dean/exam-authority/page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireDean } from '$lib/server/auth/guards.js';
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
			departments: { select: { department: { select: { id: true, name: true } } } }
		},
		orderBy: { createdAt: 'desc' }
	});

	const authorities = await Promise.all(
		offerings.map((o) => getActiveExamAuthority(o.id, collegeId))
	);

	const examOfficers = await prisma.user.findMany({
		where: { role: 'exam_officer', collegeId },
		select: { id: true, fullName: true }
	});

	return {
		offerings: offerings.map((o, i) => ({ ...o, authority: authorities[i] })),
		examOfficers
	};
};

export const actions: Actions = {
	setAuthority: async ({ request, locals }) => {
		requireDean(locals.user);
		const collegeId = locals.user!.collegeId!;
		const form = await request.formData();

		const offeringId = form.get('offeringId') as string;
		const scope = form.get('scope') as ExamAuthorityScope;
		const reason = (form.get('reason') as string) || undefined;
		const assignedUserId = (form.get('assignedUserId') as string) || undefined;

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
	}
};