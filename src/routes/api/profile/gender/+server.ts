// src/routes/api/profile/gender/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent, requireStaff } from '$lib/server/auth/guards';
import { updateGender } from '$lib/server/profile.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { gender } = await request.json();
	if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) throw error(400, 'Invalid gender value.');

	const prisma = await getPrismaClient();

	if (locals.user?.type === 'student') {
		const student = await requireStudent(locals.user);
		await updateGender('student', student.id, gender, prisma);
	} else {
		const staff = await requireStaff(locals.user);
		await updateGender('staff', staff.id, gender, prisma);
	}

	return json({ success: true });
};