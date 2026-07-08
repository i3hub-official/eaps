// src/routes/(auth)/logout/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { STUDENT_COOKIE, STAFF_COOKIE, cookieOptions } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	// Defensive: if user refreshes the logout page while still having a cookie,
	// clear it so they don't see "signed out" while actually still logged in.
	const stillHasStudent = cookies.get(STUDENT_COOKIE);
	const stillHasStaff = cookies.get(STAFF_COOKIE);

	if (stillHasStudent) {
		cookies.delete(STUDENT_COOKIE, { ...cookieOptions, path: '/' });
	}
	if (stillHasStaff) {
		cookies.delete(STAFF_COOKIE, { ...cookieOptions, path: '/' });
	}

	return {};
};

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		// Clear both cookie types — we don't know which user type is logging out
		cookies.delete(STUDENT_COOKIE, { ...cookieOptions, path: '/' });
		cookies.delete(STAFF_COOKIE, { ...cookieOptions, path: '/' });

		// Clear server-side session data if present
		if (locals.session) {
			locals.session = null;
		}

		// TODO: Also invalidate the session token in your session store
		// (Redis/DB) so the token can't be reused even if stolen.
		// if (locals.sessionToken) {
		//     await invalidateSession(locals.sessionToken);
		// }

		throw redirect(303, '/logout');
	}
};