// src/routes/(student)/student/profile/+page.server.ts
import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStudent } from '$lib/server/auth/guards';
import { loadProfile } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
	const student = await requireStudent(locals.user);
	const prisma = await getPrismaClient();

	const profile = await loadProfile(student, prisma);
	return { profile };
};