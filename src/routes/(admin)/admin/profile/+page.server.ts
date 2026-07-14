// src/routes/(admin)/admin/profile/+page.server.ts
// Same file (just adjust the folder) for:
//   src/routes/(deo)/deo/profile/+page.server.ts
//   src/routes/(lecturer)/lecturer/profile/+page.server.ts
//   src/routes/(invigilator)/invigilator/profile/+page.server.ts
//
// Uses requireStaff rather than a role-specific guard on purpose — this is
// an account-settings page, not a role-gated capability, so any
// authenticated staff member (VC, DVC, Dean, HOD, Lecturer, Invigilator,
// exam officers, etc.) should be able to reach their own profile
// regardless of which portal it's nested under. Swap to a role-specific
// guard here only if you specifically want to restrict *who* can view
// this route, not just who it's for.
import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireStaff } from '$lib/server/auth/guards';
import { loadProfile } from '$lib/server/profile.js';

export const load: PageServerLoad = async ({ locals }) => {
	const staff = await requireStaff(locals.user);
	const prisma = await getPrismaClient();

	const profile = await loadProfile(staff, prisma);
	return { profile };
};