// src/routes/(auth)/logout/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'
import {
	STUDENT_COOKIE,
	STAFF_COOKIE,
	cookieOptions,
	invalidateStaffSession,
	invalidateStudentSession,
} from '$lib/server/auth'

export const load: PageServerLoad = async ({ cookies }) => {
	// Defensive: if user refreshes the logout page while still having a cookie,
	// clear it so they don't see "signed out" while actually still logged in.
	const stillHasStudent = cookies.get(STUDENT_COOKIE)
	const stillHasStaff = cookies.get(STAFF_COOKIE)

	if (stillHasStudent) {
		cookies.delete(STUDENT_COOKIE, { ...cookieOptions, path: '/' })
	}
	if (stillHasStaff) {
		cookies.delete(STAFF_COOKIE, { ...cookieOptions, path: '/' })
	}

	return {}
}

export const actions: Actions = {
	default: async ({ cookies }) => {
		// Extract tokens before deleting cookies
		const staffToken = cookies.get(STAFF_COOKIE)
		const studentToken = cookies.get(STUDENT_COOKIE)

		// Invalidate session in database (fire-and-forget, don't wait for both)
		if (staffToken) {
			invalidateStaffSession(staffToken).catch(() => {})
		}
		if (studentToken) {
			invalidateStudentSession(studentToken).catch(() => {})
		}

		// Clear both cookie types from client
		cookies.delete(STUDENT_COOKIE, { ...cookieOptions, path: '/' })
		cookies.delete(STAFF_COOKIE, { ...cookieOptions, path: '/' })

		throw redirect(303, '/login')
	},
}