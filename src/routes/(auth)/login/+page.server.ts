import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import {
	verifyPassword,
	createStaffSession,
	createStudentSession,
	STAFF_COOKIE,
	STUDENT_COOKIE,
	cookieOptions,
} from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'
import { searchHashFor } from '$lib/security/dataProtection'

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData()
		const rawEmail = String(form.get('identifier') ?? '').trim()
		const password = String(form.get('password') ?? '')

		if (!rawEmail || !password) {
			return fail(400, { error: 'Enter your email and password.', identifier: rawEmail })
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
			return fail(400, { error: 'Enter a valid email address.', identifier: rawEmail })
		}
		const meta = {
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent') ?? undefined,
		}

		const prisma = await getPrismaClient()
		const emailHash = await searchHashFor(rawEmail, 'email')

		const staff = await prisma.staff.findUnique({
			where: { emailHash },
		})
		if (staff) {
			if (staff.status !== 'ACTIVE') {
				return fail(403, { error: 'This account is not active. Contact the registrar.', identifier: rawEmail })
			}
			const ok = await verifyPassword(password, staff.passwordHash)
			if (!ok) return fail(400, { error: 'Invalid credentials.', identifier: rawEmail })

			const { token } = await createStaffSession(staff.id, meta)
			cookies.set(STAFF_COOKIE, token, cookieOptions)
			throw redirect(303, staffRoleHome(staff.primaryRole))
		}

		const student = await prisma.student.findUnique({
			where: { emailHash },
		})
		if (student) {
			if (student.status !== 'ACTIVE') {
				return fail(403, { error: 'This account is not active. Contact your department.', identifier: rawEmail })
			}
			const ok = await verifyPassword(password, student.passwordHash)
			if (!ok) return fail(400, { error: 'Invalid credentials.', identifier: rawEmail })

			const { token } = await createStudentSession(student.id, meta)
			cookies.set(STUDENT_COOKIE, token, cookieOptions)
			throw redirect(303, '/student')
		}

		return fail(400, { error: 'Invalid credentials.', identifier: rawEmail })
	},
}