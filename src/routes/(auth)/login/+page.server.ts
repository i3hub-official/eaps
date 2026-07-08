// src/routes/(auth)/login/+page.server.ts
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
	findStaffByEmail,
	findStudentByEmail,
} from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData()
		const identifier = String(form.get('identifier') ?? '').trim()
		const password = String(form.get('password') ?? '')

		if (!identifier || !password) {
			return fail(400, { error: 'Enter your email/matric number and password.', identifier })
		}

		const meta = {
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent') ?? undefined,
		}

		const isEmail = identifier.includes('@')

		if (isEmail) {
			const staff = await findStaffByEmail(identifier)
			if (staff) {
				if (staff.status !== 'ACTIVE') {
					return fail(403, { error: 'This account is not active. Contact the registrar.', identifier })
				}
				const ok = await verifyPassword(password, staff.passwordHash)
				if (!ok) return fail(400, { error: 'Invalid credentials.', identifier })

				const { token } = await createStaffSession(staff.id, meta)
				cookies.set(STAFF_COOKIE, token, cookieOptions)
				throw redirect(303, staffRoleHome(staff.primaryRole))
			}

			const student = await findStudentByEmail(identifier)
			if (student) {
				if (student.status !== 'ACTIVE') {
					return fail(403, { error: 'This account is not active. Contact your department.', identifier })
				}
				const ok = await verifyPassword(password, student.passwordHash)
				if (!ok) return fail(400, { error: 'Invalid credentials.', identifier })

				const { token } = await createStudentSession(student.id, meta)
				cookies.set(STUDENT_COOKIE, token, cookieOptions)
				throw redirect(303, '/student')
			}

			return fail(400, { error: 'Invalid credentials.', identifier })
		}

		const prisma = await getPrismaClient()
		const student = await prisma.student.findUnique({
			where: { matricNumber: identifier.toUpperCase() },
		})

		if (!student) {
			return fail(400, { error: 'Invalid credentials.', identifier })
		}
		if (student.status !== 'ACTIVE') {
			return fail(403, { error: 'This account is not active. Contact your department.', identifier })
		}
		const ok = await verifyPassword(password, student.passwordHash)
		if (!ok) return fail(400, { error: 'Invalid credentials.', identifier })

		const { token } = await createStudentSession(student.id, meta)
		cookies.set(STUDENT_COOKIE, token, cookieOptions)
		throw redirect(303, '/student')
	},
}