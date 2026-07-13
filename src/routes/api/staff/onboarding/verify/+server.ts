// src/routes/api/staff/invitations/verify/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { hashInvitationToken } from '$lib/server/auth/invitationToken'

/**
 * POST /api/staff/invitations/verify
 *
 * Verifies a staff invitation token sent in request body.
 * Token is never sent in URL — it comes from the hash fragment
 * extracted client-side and submitted in the body.
 *
 * Request body:
 * {
 *   "token": "abc123..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "invitation": {
 *     "id": "inv_123",
 *     "email": "lecturer@example.com",
 *     "college": "College of Agriculture",
 *     "department": "Plant Science",
 *     "levels": ["100", "200", "300"]
 *   }
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json()
		const { token } = body

		// Validate token is provided and has correct format
		if (!token || typeof token !== 'string' || token.length < 32) {
			throw error(400, 'Invalid or missing invitation token')
		}

		const prisma = await getPrismaClient()
		const now = new Date()

		// Hash the token to look it up (same pattern as password reset verification)
		const tokenHash = hashInvitationToken(token)

		// Find invitation by token hash
		const invitation = await prisma.staffInvitation.findUnique({
			where: { tokenHash },
			include: {
				college: { select: { name: true } },
				department: { select: { name: true } },
			},
		})

		// Token not found
		if (!invitation) {
			console.warn('[STAFF-INVITE-VERIFY] Token not found or invalid')
			throw error(404, 'Invalid invitation token')
		}

		// Check invitation status
		if (invitation.status !== 'PENDING') {
			console.warn('[STAFF-INVITE-VERIFY] Invitation not pending', {
				invitationId: invitation.id,
				status: invitation.status,
			})
			throw error(400, `Invitation has already been ${invitation.status.toLowerCase()}`)
		}

		// Check expiration
		if (now > invitation.expiresAt) {
			console.warn('[STAFF-INVITE-VERIFY] Invitation expired', {
				invitationId: invitation.id,
				expiresAt: invitation.expiresAt,
			})
			throw error(410, 'Invitation has expired. Please request a new one.')
		}

		// Token is valid — return invitation details
		// Do NOT return the token itself back to client
		return json(
			{
				success: true,
				invitation: {
					id: invitation.id,
					email: invitation.email,
					college: invitation.college.name,
					department: invitation.department.name,
					levels: invitation.levels || [],
				},
			},
			{ status: 200 }
		)
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err instanceof Error && 'status' in err) {
			throw err
		}

		console.error('[STAFF-INVITE-VERIFY] Verification error:', err)
		throw error(500, 'Failed to verify invitation')
	}
}