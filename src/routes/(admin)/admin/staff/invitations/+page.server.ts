// src/routes/api/admin/staff/invitations/create/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireAdmin } from '$lib/server/auth/guards'
import { generateStaffInvitation, sendInvitationEmail } from '$lib/server/staff/invitations'

/**
 * POST /api/admin/staff/invitations/create
 *
 * Creates and sends a staff invitation.
 * Only accessible by department HODs/admins.
 *
 * Body:
 * {
 *   email: "lecturer@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   levels: ["100", "200", "300"],
 *   expirationDays: 7
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Verify user is authenticated staff admin
		const staff = await requireAdmin(locals.user)

		// Parse request body
		const body = await request.json()
		const { email, firstName, lastName, levels, expirationDays } = body

		// Validate inputs
		if (!email || typeof email !== 'string' || !email.includes('@')) {
			throw error(400, 'Invalid email address')
		}

		if (!firstName || typeof firstName !== 'string' || firstName.length < 2) {
			throw error(400, 'Invalid first name')
		}

		if (!lastName || typeof lastName !== 'string' || lastName.length < 2) {
			throw error(400, 'Invalid last name')
		}

		if (!Array.isArray(levels) || levels.length === 0) {
			throw error(400, 'At least one level must be assigned')
		}

		// Generate secure invitation
		const { invitation, token, onboardingUrl } = await generateStaffInvitation({
			email,
			collegeId: staff.collegeId,
			departmentId: staff.departmentId,
			levels,
			expirationDays: expirationDays || 7,
		})

		// Send invitation email
		try {
			await sendInvitationEmail(
				email,
				firstName,
				lastName,
				onboardingUrl,
				staff.collegeId,
				staff.departmentId
			)
		} catch (emailErr) {
			console.error('[STAFF-INVITATIONS] Email send failed:', emailErr)
			// Don't fail the whole operation if email fails
			// Invitation is created, just email didn't send
		}

		console.info('[STAFF-INVITATIONS] Invitation created:', {
			invitationId: invitation.id,
			email,
			createdBy: staff.id,
		})

		return json(
			{
				success: true,
				invitation: {
					id: invitation.id,
					email: invitation.email,
					status: invitation.status,
					expiresAt: invitation.expiresAt,
				},
				// Return onboarding URL for admin to manually send if email fails
				onboardingUrl,
				message: `Invitation sent to ${email}. They have ${expirationDays || 7} days to complete their profile.`,
			},
			{ status: 201 }
		)
	} catch (err) {
		console.error('[STAFF-INVITATIONS] Error creating invitation:', err)

		if (err instanceof Error && 'status' in err) {
			throw err
		}

		throw error(500, 'Failed to create invitation')
	}
}