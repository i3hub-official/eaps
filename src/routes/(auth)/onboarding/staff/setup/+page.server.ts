// src/routes/onboarding/staff/setup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hash } from '@node-rs/argon2'
import crypto from 'crypto'

const ARGON2_OPTIONS = {
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 4,
}

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to login if already authenticated
	if (locals.user) {
		throw redirect(303, '/staff/dashboard')
	}

	return {}
}

export const actions: Actions = {
	setup: async ({ request, getClientAddress }) => {
		const form = await request.formData()

		// Extract form data
		const token = form.get('token')?.toString()
		const firstName = form.get('firstName')?.toString()?.trim()
		const lastName = form.get('lastName')?.toString()?.trim()
		const phoneNumber = form.get('phoneNumber')?.toString()?.trim()
		const password = form.get('password')?.toString()
		const confirmPassword = form.get('confirmPassword')?.toString()

		// ─── Validation ──────────────────────────────────────────────────────
		if (!token) {
			return fail(400, {
				error: 'Session expired',
				details: 'Your onboarding token is missing. Please start over.',
			})
		}

		if (!firstName || firstName.length < 2) {
			return fail(400, { error: 'Invalid first name' })
		}

		if (!lastName || lastName.length < 2) {
			return fail(400, { error: 'Invalid last name' })
		}

		if (!phoneNumber || phoneNumber.length < 10) {
			return fail(400, { error: 'Invalid phone number' })
		}

		if (!password || password.length < 8) {
			return fail(400, {
				error: 'Password too weak',
				details: 'Password must be at least 8 characters.',
			})
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' })
		}

		// Check password strength
		const strength = [
			password.length >= 8,
			password.length >= 12,
			/[A-Z]/.test(password) && /[a-z]/.test(password),
			/[0-9]/.test(password),
			/[^A-Za-z0-9]/.test(password),
		].filter(Boolean).length

		if (strength < 3) {
			return fail(400, {
				error: 'Password too weak',
				details: 'Use uppercase, lowercase, numbers, and symbols.',
			})
		}

		const prisma = await getPrismaClient()
		const ip = getClientAddress()

		try {
			// ─── Verify token ──────────────────────────────────────────────
			const tokenHash = crypto
				.createHash('sha256')
				.update(token)
				.digest('hex')

			const invitation = await prisma.staffInvitation.findUnique({
				where: { tokenHash },
				include: { department: true, college: true },
			})

			if (!invitation) {
				console.warn('[STAFF-SETUP] Invalid token:', { tokenHash: tokenHash.slice(0, 8) + '...' })
				return fail(400, { error: 'Invalid invitation token' })
			}

			if (invitation.status !== 'PENDING') {
				console.warn('[STAFF-SETUP] Invitation not pending:', { invitationId: invitation.id, status: invitation.status })
				return fail(400, {
					error: 'Invitation already used',
					details: `This invitation has already been ${invitation.status.toLowerCase()}.`,
				})
			}

			const now = new Date()
			if (now > invitation.expiresAt) {
				console.warn('[STAFF-SETUP] Invitation expired:', { invitationId: invitation.id })
				return fail(400, {
					error: 'Invitation expired',
					details: 'Please request a new invitation.',
				})
			}

			// Check if staff account already exists (shouldn't happen, but safety check)
			const existingStaff = await prisma.staff.findUnique({
				where: { email: invitation.email },
			})

			if (existingStaff) {
				console.warn('[STAFF-SETUP] Staff account exists:', { email: invitation.email })
				return fail(400, {
					error: 'Account already exists',
					details: 'An account for this email already exists. Try logging in instead.',
				})
			}

			// ─── Create staff account ──────────────────────────────────────
			const passwordHash = await hash(password, ARGON2_OPTIONS)

			const staff = await prisma.staff.create({
				data: {
					email: invitation.email,
					firstName,
					lastName,
					phoneNumber,
					password: passwordHash,
					departmentId: invitation.departmentId,
					collegeId: invitation.collegeId,
					isActive: true,
					emailVerified: true, // Email already verified by invitation
					levels: invitation.levels,
				},
			})

			// ─── Mark invitation as ACCEPTED and update invitation ──────────
			await prisma.staffInvitation.update({
				where: { id: invitation.id },
				data: {
					status: 'ACCEPTED',
					acceptedAt: now,
					acceptedIp: ip,
					staffId: staff.id,
				},
			})

			console.info('[STAFF-SETUP] Staff account created:', {
				staffId: staff.id,
				email: staff.email,
				department: invitation.department.name,
			})

			// Return success — frontend will redirect to login
			return { success: true }
		} catch (err) {
			console.error('[STAFF-SETUP] Error creating account:', err)

			if (err instanceof Error && err.message.includes('Unique constraint failed')) {
				return fail(400, {
					error: 'Email already registered',
					details: 'This email is already associated with a staff account.',
				})
			}

			return fail(500, {
				error: 'Account creation failed',
				details: 'An error occurred. Please try again.',
			})
		}
	},
}