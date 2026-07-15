// src/routes/(auth)/onboard/developer/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'
import { hashPassword, validatePasswordStrength, createStaffSession, STAFF_COOKIE, cookieOptions } from '$lib/server/auth'
import { staffRoleHome } from '$lib/server/auth/roleHome'
import { protectStaffData, searchHashFor } from '$lib/security/dataProtection.js'
import { StaffRole } from '@prisma/client'

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/admin')
	}
	return {}
}

export const actions: Actions = {
	setup: async ({ request, cookies, getClientAddress }) => {
		const formData = await request.formData()
		const token = String(formData.get('token') ?? '')
		const firstName = String(formData.get('firstName') ?? '').trim()
		const lastName = String(formData.get('lastName') ?? '').trim()
		const phoneNumber = String(formData.get('phoneNumber') ?? '').trim()
		const password = String(formData.get('password') ?? '')
		const confirmPassword = String(formData.get('confirmPassword') ?? '')

		console.log('[developer/onboard] Setup started for token:', token ? token.substring(0, 10) + '...' : 'none')

		if (!token) {
			return fail(400, { error: 'Your onboarding session is missing. Please start over from your invitation email.' })
		}

		const errors: Record<string, string> = {}
		if (!firstName || firstName.length < 2) errors.firstName = 'First name is required'
		if (!lastName || lastName.length < 2) errors.lastName = 'Last name is required'
		if (!phoneNumber || phoneNumber.length < 10) errors.phoneNumber = 'A valid phone number is required'
		if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
		const pwErr = validatePasswordStrength(password)
		if (pwErr) errors.password = pwErr

		if (Object.keys(errors).length > 0) {
			console.log('[developer/onboard] Validation errors:', errors)
			return fail(400, { errors })
		}

		const prisma = await getPrismaClient()
		const tokenHash = hashInvitationToken(token)

		console.log('[developer/onboard] Looking for invitation with hash:', tokenHash)

		// ─── Find the invitation ──────────────────────────────────────────
		const invitation = await prisma.developerTeam.findFirst({
			where: {
				tokenHash: tokenHash,
				isActive: false,  // Only find invitations that haven't been accepted
				tokenExpiresAt: { gt: new Date() }  // And haven't expired
			},
		})

		if (!invitation) {
			console.log('[developer/onboard] Invitation not found or already accepted')
			
			// Check if it was already accepted
			const existingAccepted = await prisma.developerTeam.findFirst({
				where: {
					tokenHash: tokenHash,
					isActive: true,
					acceptedAt: { not: null }
				}
			})
			
			if (existingAccepted) {
				return fail(400, { error: 'This invitation has already been used. Please login with your new account.' })
			}
			
			return fail(400, { error: 'Invalid invitation. Please check your link and try again.' })
		}

		console.log('[developer/onboard] Invitation found:', invitation.email)

		// ─── Check if a staff member already exists with this email ──────
		// IMPORTANT: Staff uses emailHash, not email directly
		const emailHash = await searchHashFor(invitation.email, 'email')
		const existingStaff = await prisma.staff.findUnique({
			where: { emailHash },
		})

		if (existingStaff) {
			return fail(400, { 
				error: 'A staff account already exists with this email address. Please login or contact your administrator.' 
			})
		}

		const passwordHash = await hashPassword(password)
		const staffNumber = `DEV-${Date.now().toString(36).toUpperCase()}`

		try {
			const staff = await prisma.$transaction(async (tx) => {
				const protectedData = await protectStaffData({
					email: invitation.email,
					firstName,
					lastName,
					phone: phoneNumber,
					staffNumber: staffNumber,
				})

				// Create staff with SUPER_ADMIN role (developers get full access)
				const createdStaff = await tx.staff.create({
					data: {
						staffNumber: staffNumber,
						email: protectedData.email,
						emailHash: protectedData.emailHash,
						firstName: protectedData.firstName,
						firstNameHash: protectedData.firstNameHash,
						lastName: protectedData.lastName,
						lastNameHash: protectedData.lastNameHash,
						phone: protectedData.phone,
						phoneHash: protectedData.phoneHash,
						passwordHash,
						primaryRole: StaffRole.SUPER_ADMIN,
						status: 'ACTIVE',
						mustChangePassword: false,
					},
				})

				console.log('[developer/onboard] Staff created:', createdStaff.id)

				// Assign SUPER_ADMIN role
				const role = await tx.role.findUnique({ where: { name: StaffRole.SUPER_ADMIN } })
				if (role) {
					await tx.staffRoleAssignment.create({
						data: { staffId: createdStaff.id, roleId: role.id, isActive: true },
					})
					console.log('[developer/onboard] SUPER_ADMIN role assigned')
				}

				// ─── Mark invitation as accepted ──────────────────────────
				await tx.developerTeam.update({
					where: { id: invitation.id },
					data: { 
						isActive: true,
						acceptedAt: new Date(),
						tokenHash: null,  // Clear the token hash so it can't be used again
						tokenExpiresAt: null,
					},
				})

				console.log('[developer/onboard] Invitation marked as accepted')

				return createdStaff
			})

			// Create session and log in
			const ip = getClientAddress()
			const userAgent = request.headers.get('user-agent') ?? undefined
			const { token: sessionToken } = await createStaffSession(staff.id, { ipAddress: ip, userAgent })
			cookies.set(STAFF_COOKIE, sessionToken, cookieOptions)

			console.log('[developer/onboard] Session created, redirecting to admin')

			throw redirect(303, staffRoleHome(staff.primaryRole))
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) throw err
			console.error('[developer/onboard] Failed to complete onboarding:', err)
			return fail(500, { error: 'Failed to complete onboarding. Please try again or contact your administrator.' })
		}
	},
}