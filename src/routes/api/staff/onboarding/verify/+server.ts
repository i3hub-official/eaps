// src/routes/api/staff/onboarding/verify/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import crypto from 'crypto'

/**
 * POST /api/staff/onboarding/verify
 * 
 * Verifies a staff invitation token (sent in request body, not URL).
 * Token must be a valid, unexpired, pending invitation.
 * Returns invitation details if valid, or error if invalid/expired.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse token from request body
		const body = await request.json()
		const { token } = body

		// Validate token is provided
		if (!token || typeof token !== 'string' || token.length < 32) {
			throw error(400, 'Invalid token format')
		}

		const prisma = await getPrismaClient()

		// Hash the token to look it up (same way it was stored)
		// Tokens should be hashed in DB for security
		const tokenHash = crypto
			.createHash('sha256')
			.update(token)
			.digest('hex')

		// Look up invitation by token hash
		const invitation = await prisma.staffInvitation.findUnique({
			where: { tokenHash },
			include: {
				college: { select: { id: true, name: true } },
				department: { select: { id: true, name: true } },
			},
		})

		// Invitation not found
		if (!invitation) {
			console.warn('[STAFF-ONBOARDING] Token not found or invalid:', { tokenHash: tokenHash.slice(0, 8) + '...' })
			throw error(404, 'Invalid invitation token')
		}

		// Check invitation status
		if (invitation.status !== 'PENDING') {
			console.warn('[STAFF-ONBOARDING] Invitation not pending:', {
				invitationId: invitation.id,
				status: invitation.status,
			})
			throw error(400, `Invitation has already been ${invitation.status.toLowerCase()}`)
		}

		// Check expiration
		const now = new Date()
		if (now > invitation.expiresAt) {
			console.warn('[STAFF-ONBOARDING] Invitation expired:', {
				invitationId: invitation.id,
				expiresAt: invitation.expiresAt,
			})
			throw error(410, 'Invitation has expired. Please request a new one.')
		}

		// Token is valid — return safe data to client
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
		// Log but don't expose internal details to client
		if (err instanceof Error && 'status' in err) {
			// Re-throw SvelteKit errors
			throw err
		}

		console.error('[STAFF-ONBOARDING] Verification error:', err)
		throw error(500, 'Failed to verify invitation')
	}
}