// src/routes/(lecturer)/lecturer/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user);
	return { user };
};