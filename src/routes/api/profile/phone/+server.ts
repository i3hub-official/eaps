// src/routes/api/profile/phone/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent, requireStaff } from '$lib/server/auth/guards';
import { updatePhone } from '$lib/server/profile.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { phone } = await request.json();
	if (typeof phone !== 'string') throw error(400, 'Invalid phone number.');

	const prisma = await getPrismaClient();

	if (locals.user?.type === 'student') {
		const student = await requireStudent(locals.user);
		await updatePhone('student', student.id, phone, prisma);
	} else {
		const staff = await requireStaff(locals.user);
		await updatePhone('staff', staff.id, phone, prisma);
	}

	return json({ success: true });
};