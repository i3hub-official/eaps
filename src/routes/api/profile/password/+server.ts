// src/routes/api/profile/password/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent, requireStaff } from '$lib/server/auth/guards';
import { changePassword } from '$lib/server/profile.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { currentPassword, newPassword } = await request.json();
	if (!currentPassword || !newPassword) throw error(400, 'Missing password fields.');

	const prisma = await getPrismaClient();
	let result;

	if (locals.user?.type === 'student') {
		const student = await requireStudent(locals.user);
		result = await changePassword('student', student.id, currentPassword, newPassword, prisma);
	} else {
		const staff = await requireStaff(locals.user);
		result = await changePassword('staff', staff.id, currentPassword, newPassword, prisma);
	}

	if (!result.ok) return json({ success: false, message: result.message }, { status: 400 });
	return json({ success: true });
};