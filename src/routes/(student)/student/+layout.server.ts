// src/routes/(student)/student/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards'

export const load: LayoutServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user)

	const firstName = student.firstName
	const otherName = student.otherNames
	const lastName = student.lastName

	return {
		user: {
			name: `${lastName} ${firstName}`.trim(),
			initials: `${lastName?.[0] ?? ''}${firstName?.[0] ?? ''}`.toUpperCase() || '?',
		},
	};
};