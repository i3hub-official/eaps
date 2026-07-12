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
} from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'
import { searchHashFor, revealName } from '$lib/security/dataProtection'
import { sendLoginAlertEmail } from '$lib/server/auth/email'

// Encrypted names can fail to decrypt if stale/corrupt — fall back rather
// than throwing and taking down the login flow over a notification email.
function safeDecrypt(fn: () => string, fallback: string): string {
	try {
		return fn()
	} catch {
		return fallback
	}
}

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

			// Fire-and-forget — never block or fail login over a notification email.
			const staffName = `${safeDecrypt(() => revealName(staff.firstName), '')} ${safeDecrypt(() => revealName(staff.lastName), '')}`.trim();
			sendLoginAlertEmail(rawEmail, staffName || 'there', new Date(), meta.ipAddress, meta.userAgent).catch((err) => {
				console.error('[login] Failed to send login alert email:', err)
			})

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

			// Fire-and-forget — never block or fail login over a notification email.
			const studentName = `${safeDecrypt(() => revealName(student.firstName), '')} ${safeDecrypt(() => revealName(student.lastName), '')}`.trim();
			sendLoginAlertEmail(rawEmail, studentName || 'there', new Date(), meta.ipAddress, meta.userAgent).catch((err) => {
				console.error('[login] Failed to send login alert email:', err)
			})

			throw redirect(303, '/student')
		}

		return fail(400, { error: 'Invalid credentials.', identifier: rawEmail })
	},
}