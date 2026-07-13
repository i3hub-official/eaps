// src/routes/staff/onboarding/profile/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'
import { hash } from '@node-rs/argon2'

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
				details: 'Your onboarding token is missing. Please start over with a new invitation link.',
			})
		}

		if (!firstName || firstName.length < 2) {
			return fail(400, { error: 'First name must be at least 2 characters' })
		}

		if (!lastName || lastName.length < 2) {
			return fail(400, { error: 'Last name must be at least 2 characters' })
		}

		if (!phoneNumber || phoneNumber.length < 10) {
			return fail(400, { error: 'Phone number must be at least 10 digits' })
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

		// Check password strength (same as registration)
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
			// ─── Verify invitation token ──────────────────────────────────────
			const tokenHash = hashInvitationToken(token)

			const invitation = await prisma.staffInvitation.findUnique({
				where: { tokenHash },
				include: { department: true, college: true },
			})

			if (!invitation) {
				console.warn('[STAFF-PROFILE] Invalid token:', { tokenHash: tokenHash.slice(0, 8) + '...' })
				return fail(400, { error: 'Invalid invitation token' })
			}

			if (invitation.status !== 'PENDING') {
				console.warn('[STAFF-PROFILE] Invitation not pending:', {
					invitationId: invitation.id,
					status: invitation.status,
				})
				return fail(400, {
					error: 'Invitation already used',
					details: `This invitation has already been ${invitation.status.toLowerCase()}.`,
				})
			}

			const now = new Date()
			if (now > invitation.expiresAt) {
				console.warn('[STAFF-PROFILE] Invitation expired:', { invitationId: invitation.id })
				return fail(400, {
					error: 'Invitation expired',
					details: 'Please request a new invitation from your department.',
				})
			}

			// Check if staff account already exists
			const existingStaff = await prisma.staff.findUnique({
				where: { email: invitation.email },
			})

			if (existingStaff) {
				console.warn('[STAFF-PROFILE] Staff account exists:', { email: invitation.email })
				return fail(400, {
					error: 'Account already exists',
					details: 'An account for this email already exists. Try logging in instead.',
				})
			}

			// ─── Hash password with Argon2 ────────────────────────────────────
			let passwordHash: string
			try {
				passwordHash = await hash(password, ARGON2_OPTIONS)
			} catch (hashErr) {
				console.error('[STAFF-PROFILE] Password hashing failed:', hashErr)
				return fail(500, {
					error: 'Password encryption failed',
					details: 'An error occurred while securing your password. Please try again.',
				})
			}

			// ─── Create staff account in transaction ──────────────────────────
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
					emailVerified: true, // Email already verified via invitation
					levels: invitation.levels,
				},
			})

			// ─── Update invitation status ──────────────────────────────────────
			await prisma.staffInvitation.update({
				where: { id: invitation.id },
				data: {
					status: 'ACCEPTED',
					acceptedAt: now,
					acceptedIp: ip,
					staffId: staff.id,
				},
			})

			console.info('[STAFF-PROFILE] Staff account created:', {
				staffId: staff.id,
				email: staff.email,
				firstName: staff.firstName,
				lastName: staff.lastName,
				department: invitation.department.name,
			})

			// Return success — frontend will redirect to login
			return { success: true }
		} catch (err) {
			console.error('[STAFF-PROFILE] Error creating account:', err)

			// Handle duplicate email constraint
			if (
				err instanceof Error &&
				(err.message.includes('Unique constraint failed') ||
					err.message.includes('unique_email'))
			) {
				return fail(400, {
					error: 'Email already registered',
					details: 'This email is already associated with a staff account.',
				})
			}

			return fail(500, {
				error: 'Account creation failed',
				details: 'An unexpected error occurred. Please try again.',
			})
		}
	},
}