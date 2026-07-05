// src/routes/api/dean/exam-authority/+server.ts
import { json } from '@sveltejs/kit';
import { setExamAuthority } from '$lib/server/academic/exam-authority.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user || user.role !== 'dean') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	if (user.collegeId == null) {
		return json({ error: 'Dean has no college assigned' }, { status: 400 });
	}

	const { offeringId, scope, reason, assignedUserId } = await request.json();

	try {
		const result = await setExamAuthority({
			offeringId,
			collegeId: user.collegeId,
			scope,
			setByDeanId: user.id,
			reason,
			assignedUserId
		});
		return json({ success: true, assignment: result });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};