// src/routes/student/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards'

export const load: LayoutServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user)

	const firstName = student.firstName
	const lastName = student.lastName

	return {
		user: {
			name: `${firstName} ${lastName}`.trim(),
			initials: `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?',
		},
	};
};